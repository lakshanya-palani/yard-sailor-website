
import { useState } from "react";
import { supabase } from "../lib/supabase";
import { Button } from "./ui/Button";

const REPORT_REASONS = [
  { value: "scam", label: "Scam or suspicious activity" },
  { value: "misleading", label: "Misleading listing information" },
  { value: "prohibited", label: "Prohibited or unsafe item" },
  { value: "harassment", label: "Harassment or inappropriate content" },
  { value: "other", label: "Other" },
];

function ReportListing({ listingId, listingType = "product", ownerId }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("scam");
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function submitReport(event) {
    event.preventDefault();
    if (submitting) return;

    setSubmitting(true);
    setError("");
    setMessage("");

    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        setError("Please sign in to report a listing.");
        return;
      }

      if (user.id === ownerId) {
        setError("You cannot report your own listing.");
        return;
      }

      const { error: reportError } = await supabase
        .from("listing_reports")
        .insert({
          reporter_id: user.id,
          listing_id: listingId,
          listing_type: listingType,
          reason,
          details: details.trim() || null,
        });

      if (reportError) throw reportError;

      setMessage("Thank you. Your report has been submitted for review.");
      setOpen(false);
      setDetails("");
    } catch (reportError) {
      console.error("Unable to submit listing report:", reportError);
      setError("Unable to submit your report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="report-listing">
      <Button
        type="button"
        variant="secondary"
        onClick={() => {
          setOpen(!open);
          setError("");
          setMessage("");
        }}
      >
        {open ? "Cancel Report" : "Report Listing"}
      </Button>

      {open && (
        <form onSubmit={submitReport} className="report-listing-form">
          <label>
            Reason
            <select value={reason} onChange={event => setReason(event.target.value)}>
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

      {message && <p role="status">{message}</p>}
    </div>
  );
}

export default ReportListing;
