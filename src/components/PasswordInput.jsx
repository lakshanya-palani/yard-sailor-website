import { useState } from "react";
import { Eye, EyeOff, LockKeyhole } from "lucide-react";
import { TextInput } from "./ui/TextInput";
import { IconButton } from "./ui/IconButton";

/** Password TextInput with a lock icon and a show/hide eye toggle (auth pages). */
export function PasswordInput(props) {
  const [visible, setVisible] = useState(false);
  return (
    <TextInput
      {...props}
      type={visible ? "text" : "password"}
      leadingIcon={<LockKeyhole size={20} />}
      trailing={(
        <IconButton
          label={visible ? "Hide password" : "Show password"}
          onClick={() => setVisible(value => !value)}
        >
          {visible ? <EyeOff /> : <Eye />}
        </IconButton>
      )}
    />
  );
}
