// src/Components/DisableAutocomplete.jsx
import { useEffect } from "react";

export default function DisableAutocomplete() {
  useEffect(() => {
    document.querySelectorAll("input").forEach((el) => {
      el.setAttribute("autocomplete", "off");
    });
  }, []);

  return null;
}
