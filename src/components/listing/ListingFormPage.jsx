import { FormActions, FormCard } from "../layout/FormLayout";
import { PageHeader } from "../layout/PageHeader";
import { PageShell } from "../layout/PageShell";
import { Button } from "../ui/Button";
import { FormAlert } from "../ui/FormAlert";
import { StatusMessage } from "../ui/StatusMessage";
import "./ListingFormPage.css";

/**
 * Page frame shared by the create/edit listing forms: header, card, error alert and
 * Cancel/submit actions. The page owns submission; `locked` disables every control
 * (e.g. while a draft is being restored).
 */
export function ListingFormPage({
  title,
  subtitle,
  backTo,
  backLabel,
  onSubmit,
  locked = false,
  message,
  submitting = false,
  submitLabel,
  submittingLabel,
  onCancel,
  children,
}) {
  return (
    <PageShell>
      <div className="listing-form">
        <PageHeader eyebrow="Yard Sailor" title={title} subtitle={subtitle} backTo={backTo} backLabel={backLabel} />
        <FormCard>
          <form onSubmit={onSubmit}>
            <fieldset disabled={locked} className="fieldset-reset">
              {message && <FormAlert className="listing-form__alert">{message}</FormAlert>}
              {children}
              <FormActions>
                <Button variant="secondary" onClick={onCancel}>Cancel</Button>
                <Button type="submit" loading={submitting}>{submitting ? submittingLabel : submitLabel}</Button>
              </FormActions>
            </fieldset>
          </form>
        </FormCard>
      </div>
    </PageShell>
  );
}

/** Loading / signed-out / load-error state in the same frame. */
export function ListingFormStatus({ kind = "empty", children }) {
  return (
    <PageShell width="narrow">
      {kind === "loading"
        ? <StatusMessage kind="loading">{children}</StatusMessage>
        : <StatusMessage kind={kind} title={children} titleAs="h1" />}
    </PageShell>
  );
}
