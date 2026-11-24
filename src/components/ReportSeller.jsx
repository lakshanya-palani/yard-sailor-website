
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/Button";

const REPORT_REASONS = [
  { value: "scam", label: "Scam or fraudulent activity" },
  { value: "harassment", label: "Harassment or inappropriate behavior" },
  { value: "misleading", label: "Misleading seller information" },
  { value: "suspicious", label: "Suspicious account activity" },
  { value: "other", label: "Other" },
];

function ReportSeller({ sellerId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function submitReport(event) {
    event.preventDefault();
    if (submitting || success || !sellerId) return;

    setSubmitting(true);
    setError("");

    try {
      const { data: { user }, error: authError } =
        await supabase.auth.getUser();

      if (authError || !user) {
        setError("Please sign in to report a seller.");
        return;
      }

      if (user.id === sellerId) {
        setError("You cannot report yourself.");
        return;
      }

      const { error: reportError } = await supabase
        .from("seller_reports")
        .insert({
          reporter_id: user.id,
          seller_id: sellerId,
          reason,
          details: details.trim() || null,
        });

      if (reportError) throw reportError;

      setSuccess(true);
      setOpen(false);
      setDetails("");
    } catch (reportError) {
      console.error("Unable to report seller:", reportError);
      setError("Unable to submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="report-listing">
      {!success && (
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setOpen(value => !value);
            setError("");
          }}
        >
          {open ? "Cancel Report" : "Report Seller"}
        </Button>
      )}

      {open && !success && (
        <form onSubmit={submitReport} className="report-listing-form">
          <label>
            Reason
            <select
              value={reason}
              onChange={event => setReason(event.target.value)}
            >
              {REPORT_REASONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Additional details (optional)
            <textarea
              value={details}
              onChange={event => setDetails(event.target.value)}
              maxLength={1000}
              rows={4}
              placeholder="Describe the issue..."
            />
          </label>

          {error && <p role="alert">{error}</p>}

          <Button type="submit" disabled={submitting}>
            {submitting ? "Submitting..." : "Submit Report"}
          </Button>
        </form>
      )}

      {success && (
        <p role="status">
          Your seller report has been submitted for review.
        </p>
      )}
    </div>
  );
}

export default ReportSeller;
