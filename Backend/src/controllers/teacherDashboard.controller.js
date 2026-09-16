import { GRADES, LANGUAGES } from '../constants/grades.js'
import { getSchoolStatus, getDashboardOverview } from '../services/teacherStatus.service.js'
import { getSchoolById } from '../services/teacherAuth.service.js'
import { getEligibleToursForSchool } from '../services/tourEligibility.service.js'
import { asyncHandler } from '../utils/asyncHandler.js'
import { sendSuccess } from '../utils/ApiResponse.js'

// The single source of truth for "which tours does this teacher/school get
// to see" — every Teacher Feedback / Student Feedback page reads its tour
// list from here, so filtering it to this school's eligible tours (core
// AWS/Robotics/Music always included, dynamic tours only if this school
// registered after the tour was created) is enough to keep every consumer
// in sync with zero other frontend changes.
export const getMeta = asyncHandler(async (req, res) => {
  const school = await getSchoolById(req.schoolId)
  sendSuccess(res, {
    message: 'Meta fetched',
    data: { tours: getEligibleToursForSchool(school), grades: GRADES, languages: LANGUAGES },
  })
})

export const getStatus = asyncHandler(async (req, res) => {
  const status = await getSchoolStatus(req.schoolId)
  sendSuccess(res, { message: 'Status fetched', data: status })
})

export const getDashboard = asyncHandler(async (req, res) => {
  const [school, overview] = await Promise.all([
    getSchoolById(req.schoolId),
    getDashboardOverview(req.schoolId),
  ])
  sendSuccess(res, {
    message: 'Dashboard fetched',
    data: { school: school.toSafeJSON(), ...overview },
  })
})
