import { School } from '../models/school.model.js'
import { ApiError } from '../utils/ApiError.js'

export async function authenticateSchoolLogin(udise, password) {
  const school = await School.findOne({ udise }).select('+password')
  if (!school) {
    throw new ApiError(401, 'Invalid UDISE or password')
  }

  const isPasswordValid = await school.comparePassword(password)
  if (!isPasswordValid) {
    throw new ApiError(401, 'Invalid UDISE or password')
  }

  // Self-heal legacy schools (registered before password support existed) by
  // persisting a proper hash once they've proven they know the UDISE.
  if (!school.password) {
    school.password = password
    await school.save()
  }

  return school
}

export async function getSchoolById(schoolId) {
  const school = await School.findById(schoolId)
  if (!school) {
    throw new ApiError(401, 'Session is no longer valid')
  }
  return school
}

// Re-verified server-side against the DB every time — never trust a
// frontend-only UDISE check. The JWT (req.schoolId) already scopes this to
// the logged-in teacher's own school; this step is a re-authentication
// confirmation the product requires before any password change, not the
// security boundary itself.
async function assertUdiseMatchesSchool(schoolId, udise) {
  const school = await getSchoolById(schoolId)
  if (String(udise).trim() !== school.udise) {
    throw new ApiError(400, 'Invalid UDISE')
  }
  return school
}

export async function verifyUdiseForPasswordChange(schoolId, udise) {
  await assertUdiseMatchesSchool(schoolId, udise)
}

export async function changeTeacherPassword(schoolId, udise, newPassword) {
  const school = await assertUdiseMatchesSchool(schoolId, udise)
  school.customPassword = newPassword
  await school.save()
}
