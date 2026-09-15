import { Router } from 'express'
import {
  teacherLogin,
  teacherLogout,
  getCurrentSchool,
  verifyUdiseForPasswordChangeHandler,
  changeTeacherPasswordHandler,
} from '../controllers/teacherAuth.controller.js'
import { authenticateSchool } from '../middleware/authenticateSchool.js'
import { createLoginRateLimiters } from '../middleware/rateLimiters.js'

const router = Router()

router.post('/login', createLoginRateLimiters('udise'), teacherLogin)
router.post('/logout', teacherLogout)
router.get('/me', authenticateSchool, getCurrentSchool)
router.post('/verify-udise', authenticateSchool, verifyUdiseForPasswordChangeHandler)
router.post('/change-password', authenticateSchool, changeTeacherPasswordHandler)

export default router
