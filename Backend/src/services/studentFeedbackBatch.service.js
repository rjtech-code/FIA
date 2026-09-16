import { StudentFeedbackBatch } from '../models/studentFeedbackBatch.model.js'
import { GRADES } from '../constants/grades.js'
import { getCurrentMonthName, getCurrentFinancialYear } from '../utils/academicPeriod.js'
import { assertTeacherFeedbackCompleted } from './teacherStatus.service.js'
import { getEligibleToursForSchool } from './tourEligibility.service.js'
import { ApiError } from '../utils/ApiError.js'

// Every Student Feedback batch now always covers every Career Tour this
// school is ELIGIBLE for — teachers no longer choose which tours were
// shown, the platform assumes every class watched all of them. This is the
// single place that decides that, in the eligible list's own canonical
// order (AWS -> Robotics -> Music, then any eligible custom tour after
// them), so no caller/API needs to send (or can override) a tour selection.
// A dynamic tour this school registered before is never included here, so
// it can never end up on a batch/completion count for that school.
//
// Computed lazily per-school (not a module-load-time constant) — the tour
// catalog is a live, in-place-refreshed array (see constants/tours.js), so
// a tour created/deleted after this module first loaded must be picked up
// on the very next batch start, not frozen at whatever it held at import
// time.
function getAllTours(school) {
  return getEligibleToursForSchool(school).map((tour) => ({ tourId: tour.tourId, tourName: tour.tourName }))
}

function unionTours(existingTours, incomingTours) {
  const merged = [...existingTours]
  const seenTourIds = new Set(existingTours.map((tour) => tour.tourId))

  incomingTours.forEach((tour) => {
    if (!seenTourIds.has(tour.tourId)) {
      merged.push(tour)
      seenTourIds.add(tour.tourId)
    }
  })

  return merged
}

// Starts (or tops up) the Student Feedback batch for a grade — how many
// students' feedback the teacher intends to collect. Every batch
// automatically covers all of getAllTours() — there is no tour selection to
// accept or validate here anymore (any `tourIds` a caller still sends is
// simply ignored; nothing depends on it). Repeat submissions for the same
// grade never overwrite or get rejected — they merge into the same
// document: student count adds up, tours union (no duplicates, and picks up
// any newly-enabled tour on a later top-up), and month/financialYear move
// forward to the latest submission.
// `language` is no longer collected from the teacher (the "In which
// language did students watch the Career Tour?" question was removed from
// the Start Feedback form) — still accepted here and passed through as-is
// if an older/other caller happens to send one, but never required, and
// never overwrites an already-stored value with a blank one on top-up.
export async function startStudentFeedbackBatch(school, { grade, studentCount, language }) {
  // Student Feedback (including just starting a batch) is rejected until
  // this school's Teacher Feedback has actually been completed — re-derived
  // from the database on every call, never trusted from whatever the UI
  // already gated on or bypassed.
  await assertTeacherFeedbackCompleted(school)

  const normalizedGrade = String(grade ?? '').trim()
  if (!normalizedGrade || !GRADES.includes(normalizedGrade)) {
    throw new ApiError(400, 'Please select a valid grade.')
  }
  if (!Number.isFinite(Number(studentCount)) || Number(studentCount) <= 0) {
    throw new ApiError(400, 'Enter the number of students.')
  }

  const month = getCurrentMonthName()
  const financialYear = getCurrentFinancialYear()

  const existing = await StudentFeedbackBatch.findOne({ school: school._id, grade: normalizedGrade })

  if (existing) {
    existing.studentCount += Number(studentCount)
    existing.tours = unionTours(existing.tours, getAllTours(school))
    if (language) existing.language = language
    existing.month = month
    existing.financialYear = financialYear
    await existing.save()
    return existing.toSafeJSON()
  }

  const created = await StudentFeedbackBatch.create({
    school: school._id,
    udise: school.udise,
    schoolName: school.schoolName,
    grade: normalizedGrade,
    studentCount: Number(studentCount),
    tours: getAllTours(school),
    language: language || '',
    month,
    financialYear,
  })

  return created.toSafeJSON()
}
