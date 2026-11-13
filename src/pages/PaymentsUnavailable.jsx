import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { StatusMessage } from "../components/ui/StatusMessage";
import { Button } from "../components/ui/Button";

export default function PaymentsUnavailable() {
  return (
      <PageShell width="narrow">
        <PageHeader title="Payments are unavailable" />
        <StatusMessage
          kind="empty"
          action={
            <>
              <Button to="/cart">View your cart</Button>
              <Button to="/shop" variant="secondary">Browse the shop</Button>
            </>
          }
        >
          <p>You can save items in your cart and message sellers to arrange a purchase.</p>
        </StatusMessage>
      </PageShell>
  );
}
