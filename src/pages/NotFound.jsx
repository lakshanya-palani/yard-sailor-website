import { PageShell } from "../components/layout/PageShell";
import { PageHeader } from "../components/layout/PageHeader";
import { StatusMessage } from "../components/ui/StatusMessage";
import { Button } from "../components/ui/Button";

export default function NotFound() {
  return (
      <PageShell width="narrow">
        <PageHeader title="Page not found" />
        <StatusMessage
          kind="empty"
          action={
            <>
              <Button to="/shop">Browse the shop</Button>
              <Button to="/" variant="secondary">Go home</Button>
            </>
          }
        >
          <p>That page may have moved. Find something new or return home.</p>
        </StatusMessage>
      </PageShell>
  );
}
