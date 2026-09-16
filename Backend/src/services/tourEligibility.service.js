import { ENABLED_TOURS, TOUR_BY_ID } from '../constants/tours.js'

// AWS (code 1), Robotics (code 2), Music (code 3) are permanent/core tours —
// every school, regardless of registration date, must always see them. The
// cohort eligibility rule below applies ONLY to tours created afterwards
// (code >= 4, i.e. every Super-Admin-created "dynamic" tour).
const CORE_TOUR_CODE_MAX = 3

// A dynamically-created tour is only usable by a school whose own
// registration (School.createdAt) happened strictly AFTER that tour was
// created (Tour.createdAt) — creating a tour must never retroactively grant
// it to schools that already existed. Both timestamps are server-generated
// (Mongoose `timestamps: true` on both models), never frontend-supplied, so
// this comparison can't be gamed by a client.
export function isTourEligibleForSchool(tour, school) {
  if (!tour) return false
  if (tour.code != null && tour.code <= CORE_TOUR_CODE_MAX) return true
  if (!tour.createdAt || !school?.createdAt) return false
  return new Date(school.createdAt).getTime() > new Date(tour.createdAt).getTime()
}

// The list a given school is allowed to see/submit feedback for, in the
// same canonical order ENABLED_TOURS already uses (AWS -> Robotics -> Music,
// then any eligible custom tours in ascending code order).
export function getEligibleToursForSchool(school) {
  return ENABLED_TOURS.filter((tour) => isTourEligibleForSchool(tour, school))
}

export function isSchoolEligibleForTourId(school, tourId) {
  return isTourEligibleForSchool(TOUR_BY_ID.get(tourId), school)
}
