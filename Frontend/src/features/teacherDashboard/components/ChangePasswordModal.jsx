import { useState } from 'react'
import Modal from '../../../components/ui/Modal'
import TextInput from '../../../components/ui/TextInput'
import PasswordInput from '../../../components/ui/PasswordInput'
import Button from '../../../components/ui/Button'
import { verifyUdiseForPasswordChangeRequest, changeTeacherPasswordRequest } from '../../../api/teacherAuth.api'
import { getApiErrorMessage } from '../../../utils/apiErrorMessage'
import { useLanguage } from '../../../hooks/useLanguage'
import { useToast } from '../../../hooks/useToast'

const STEP_VERIFY_UDISE = 1
const STEP_SET_PASSWORD = 2

// Every attempt to change a password starts back at UDISE verification
// (STEP_VERIFY_UDISE) — there is no "remembered" verified state, per the
// product requirement that this re-check happen every single time, even for
// the same teacher in the same session.
const INITIAL_STATE = {
  step: STEP_VERIFY_UDISE,
  udise: '',
  newPassword: '',
  confirmPassword: '',
  error: '',
  isSubmitting: false,
}

export default function ChangePasswordModal({ isOpen, onClose }) {
  const { t } = useLanguage()
  const toast = useToast()
  const [state, setState] = useState(INITIAL_STATE)

  const update = (patch) => setState((prev) => ({ ...prev, ...patch }))

  const handleClose = () => {
    if (state.isSubmitting) return
    setState(INITIAL_STATE)
    onClose()
  }

  const handleVerifyUdise = async (event) => {
    event.preventDefault()
    if (!state.udise.trim()) return
    update({ isSubmitting: true, error: '' })
    try {
      await verifyUdiseForPasswordChangeRequest(state.udise.trim())
      update({ isSubmitting: false, step: STEP_SET_PASSWORD, error: '' })
    } catch (error) {
      update({
        isSubmitting: false,
        error: getApiErrorMessage(error, t('teacherDashboard.changePassword.invalidUdise')),
      })
    }
  }

  const handleChangePassword = async (event) => {
    event.preventDefault()
    if (state.newPassword.length < 6) {
      update({ error: t('teacherDashboard.changePassword.passwordTooShort') })
      return
    }
    if (state.newPassword !== state.confirmPassword) {
      update({ error: t('teacherDashboard.changePassword.passwordMismatch') })
      return
    }

    update({ isSubmitting: true, error: '' })
    try {
      await changeTeacherPasswordRequest({ udise: state.udise.trim(), newPassword: state.newPassword })
      toast.success(t('teacherDashboard.changePassword.successMessage'))
      setState(INITIAL_STATE)
      onClose()
    } catch (error) {
      update({ isSubmitting: false, error: getApiErrorMessage(error) })
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="sm" closeOnBackdrop={!state.isSubmitting}>
      <div className="p-6 sm:p-8">
        <h3 className="text-xl font-semibold tracking-tight text-slate-900">
          {t('teacherDashboard.changePassword.title')}
        </h3>
        <p className="mt-1.5 text-sm text-slate-500">
          {state.step === STEP_VERIFY_UDISE
            ? t('teacherDashboard.changePassword.step1Subtitle')
            : t('teacherDashboard.changePassword.step2Subtitle')}
        </p>

        {state.error && (
          <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-medium text-red-600">
            {state.error}
          </p>
        )}

        {state.step === STEP_VERIFY_UDISE ? (
          <form className="mt-6 space-y-4" onSubmit={handleVerifyUdise}>
            <TextInput
              id="change-password-udise"
              label={t('teacherDashboard.changePassword.udiseLabel')}
              placeholder={t('teacherDashboard.changePassword.udisePlaceholder')}
              value={state.udise}
              onChange={(event) => update({ udise: event.target.value })}
              autoFocus
              required
            />
            <Button type="submit" isLoading={state.isSubmitting} disabled={!state.udise.trim()}>
              {state.isSubmitting
                ? t('teacherDashboard.changePassword.verifying')
                : t('teacherDashboard.changePassword.verifyButton')}
            </Button>
          </form>
        ) : (
          <form className="mt-6 space-y-4" onSubmit={handleChangePassword}>
            <PasswordInput
              id="change-password-new"
              label={t('teacherDashboard.changePassword.newPasswordLabel')}
              placeholder={t('teacherDashboard.changePassword.newPasswordPlaceholder')}
              value={state.newPassword}
              onChange={(event) => update({ newPassword: event.target.value })}
              autoFocus
              required
            />
            <PasswordInput
              id="change-password-confirm"
              label={t('teacherDashboard.changePassword.confirmPasswordLabel')}
              placeholder={t('teacherDashboard.changePassword.confirmPasswordPlaceholder')}
              value={state.confirmPassword}
              onChange={(event) => update({ confirmPassword: event.target.value })}
              required
            />
            <div className="flex gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => update({ step: STEP_VERIFY_UDISE, newPassword: '', confirmPassword: '', error: '' })}
                disabled={state.isSubmitting}
              >
                {t('teacherDashboard.changePassword.backButton')}
              </Button>
              <Button type="submit" isLoading={state.isSubmitting}>
                {state.isSubmitting
                  ? t('teacherDashboard.changePassword.changing')
                  : t('teacherDashboard.changePassword.changeButton')}
              </Button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
