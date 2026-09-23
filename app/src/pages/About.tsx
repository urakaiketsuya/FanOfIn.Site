import { useEffect, useState } from "react";
import type { AccountUser } from "@gatcg/shared";
import { accountApi } from "../lib/accountApi";
import { useDocumentTitle } from "../lib/useDocumentTitle";
import AboutIntro from "./AboutIntro";

export default function About() {
  useDocumentTitle(null, "Build better Grand Archive decks with real tournament data.");
  const [user, setUser] = useState<AccountUser | null>(null);

  useEffect(() => {
    let active = true;
    void accountApi.session()
      .then((session) => { if (active) setUser(session.user); })
      .catch(() => { if (active) setUser(null); });
    return () => { active = false; };
  }, []);

  return <AboutIntro user={user} />;
}
