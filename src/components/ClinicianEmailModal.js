'use client'

export default function ClinicianEmailModal({
  isOpen,
  onClose,
  onSubmit,
  title,
  description,
  periodText,
  emailLabel,
  nameLabel,
  noteLabel,
  submitLabel,
  isSubmitting,
  error,
  form,
  onFormChange,
  idPrefix = 'clinician-email',
}) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4">
      <div
        className="bg-card rounded-xl shadow-xl max-w-md w-full"
        style={{ backgroundColor: 'var(--bg-dropdown)', borderColor: 'var(--border-dropdown)', borderWidth: '1px', borderStyle: 'solid' }}
      >
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <h3 className="text-xl sm:text-2xl font-semibold font-title text-primary mb-1">{title}</h3>
          <p className="text-sm text-secondary font-sans">{description}</p>
          <div className="space-y-3 mt-2">
            <div>
              <label htmlFor={`${idPrefix}-email`} className="block text-sm font-semibold font-sans text-primary mb-2">
                {emailLabel}
              </label>
              <input
                id={`${idPrefix}-email`}
                name="consultantEmail"
                type="email"
                className="input-field-wizard w-full"
                value={form.consultantEmail}
                onChange={onFormChange}
                placeholder="dr.smith@example.com"
                required
              />
              {error ? (
                <p className="mt-1 text-xs text-[var(--text-error)] font-sans">
                  {error}
                </p>
              ) : null}
            </div>
            <div>
              <label htmlFor={`${idPrefix}-name`} className="block text-sm font-semibold font-sans text-primary mb-2">
                {nameLabel}
              </label>
              <input
                id={`${idPrefix}-name`}
                name="consultantName"
                type="text"
                className="input-field-wizard w-full"
                value={form.consultantName}
                onChange={onFormChange}
                placeholder="e.g. Dr Smith, IBD Nurse"
              />
            </div>
            <div>
              <label htmlFor={`${idPrefix}-note`} className="block text-sm font-semibold font-sans text-primary mb-2">
                {noteLabel}
              </label>
              <textarea
                id={`${idPrefix}-note`}
                name="note"
                rows={3}
                className="input-field-wizard w-full resize-none"
                value={form.note}
                onChange={onFormChange}
                placeholder="Any context you want to share with your clinician."
              />
            </div>
            {periodText ? (
              <div className="text-xs leading-normal text-secondary font-sans bg-[var(--bg-card)]/60 rounded-lg pb-2">
                {periodText}
              </div>
            ) : null}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-base font-medium button-cancel btn-size-md"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-base font-semibold button-cadet btn-size-md rounded-lg inline-flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Sending…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
