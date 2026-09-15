import { TeacherFeedback } from '../models/teacherFeedback.model.js'
import { TOUR_BY_ID, TOUR_IDS } from '../constants/tours.js'
import { getCurrentMonthName, getCurrentFinancialYear } from '../utils/academicPeriod.js'
import { ApiError } from '../utils/ApiError.js'
import { sortByFeedbackHierarchy } from '../utils/feedbackSort.js'
import { REQUIRED_GRADES } from './schoolStatus.service.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Trims, lowercases, and validates the format — never trust the frontend's
// own check alone for a field the export/report layer also relies on.
function normalizeEmail(email) {
  const trimmed = String(email ?? '').trim().toLowerCase()
  if (!trimmed || !EMAIL_PATTERN.test(trimmed)) {
    throw new ApiError(400, 'Please enter a valid email address.')
  }
  return trimmed
}

export async function listTeacherFeedback(schoolId) {
  const docs = await TeacherFeedback.find({ school: schoolId })
  // Single-school query, so "School" is constant here — this enforces the
  // Teacher -> Career Tour part of the required hierarchy.
  const sorted = sortByFeedbackHierarchy(docs, (doc) => ({
    schoolName: doc.schoolName,
    grade: null,
    type: 'Teacher',
    identifier: doc.email || doc.submittedBy,
    tourId: doc.tourId,
  }))
  return sorted.map((doc) => doc.toSafeJSON())
}

// Teacher may select ANY grade 6-12 for this submission — not restricted to
// their own assigned class (per product requirement). Validated
// server-side; the frontend's own Select options must never be trusted as
// the real check.
function normalizeGrade(grade) {
  const trimmed = String(grade ?? '').trim()
  if (!REQUIRED_GRADES.includes(trimmed)) {
    throw new ApiError(400, 'Please select a valid grade (6-12).')
  }
  return trimmed
}

export async function submitTeacherFeedback(school, { submittedBy, contactNumber, email, grade, tours }) {
  if (TOUR_IDS.length === 0) {
    // Guards against a vacuous "successful" submission: with zero enabled
    // tours, `tours.length !== TOUR_IDS.length` below would pass for an
    // empty `tours` array too, letting a Name/Email-only submission
    // silently create zero feedback records and read back as "completed"
    // (0 records >= 0 required). Fail loudly instead — there is nothing
    // valid to submit feedback for yet.
    throw new ApiError(400, 'No Career Tours are currently available to give feedback for. Please contact the administrator.')
  }
  if (!submittedBy || !String(submittedBy).trim()) {
    throw new ApiError(400, 'Your name is required.')
  }
  const normalizedEmail = normalizeEmail(email)
  const normalizedGrade = normalizeGrade(grade)
  if (!Array.isArray(tours) || tours.length !== TOUR_IDS.length) {
    throw new ApiError(400, `Feedback for all ${TOUR_IDS.length} Career Tours is required.`)
  }

  const existingCount = await TeacherFeedback.countDocuments({ school: school._id })
  if (existingCount > 0) {
    throw new ApiError(409, 'Teacher Feedback has already been submitted.')
  }

  const month = getCurrentMonthName()
  const financialYear = getCurrentFinancialYear()

  const docs = tours.map((tourAnswer) => {
    const tour = TOUR_BY_ID.get(tourAnswer.tourId)
    if (!tour) {
      throw new ApiError(400, `Unknown tour: ${tourAnswer.tourId}`)
    }
    return {
      school: school._id,
      udise: school.udise,
      schoolName: school.schoolName,
      tourId: tour.tourId,
      tourName: tour.tourName,
      language: tourAnswer.language,
      submittedBy: String(submittedBy).trim(),
      contactNumber: contactNumber ? String(contactNumber).trim() : '',
      email: normalizedEmail,
      grade: normalizedGrade,
      month,
      financialYear,
      recommendScore: tourAnswer.recommendScore,
      satisfactionResources: tourAnswer.satisfactionResources,
      easeIntegration: tourAnswer.easeIntegration,
      biggestBenefit: tourAnswer.biggestBenefit ? String(tourAnswer.biggestBenefit).trim() : '',
      improvements: tourAnswer.improvements ? String(tourAnswer.improvements).trim() : '',
    }
  })

  const created = await TeacherFeedback.insertMany(docs)
  return created.map((doc) => doc.toSafeJSON())
}
