// Entur krever at klienter identifiserer seg, ellers blir de strupet
const HEADERS = { "ET-Client-Name": "danielols3n-lifedashboard" };

/** Spørring mot Journey Planner v3. Kaster ved HTTP- eller GraphQL-feil. */
export async function journeyPlanner(query: string, variables: Record<string, unknown>) {
  const res = await fetch("https://api.entur.io/journey-planner/v3/graphql", {
    method: "POST",
    headers: { ...HEADERS, "Content-Type": "application/json" },
    body: JSON.stringify({ query, variables }),
  });
  if (!res.ok) throw new Error(`Entur svarte ${res.status}`);
  const { data, errors } = await res.json();
  if (errors?.length) throw new Error(`Entur: ${errors[0].message}`);
  return data;
}

/** Oppslag i Entur sin geocoder (stedssøk). `path` er f.eks. "autocomplete" eller "reverse". */
export async function geocoder(path: string, params: Record<string, string | number | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined) qs.set(k, String(v));
  const res = await fetch(`https://api.entur.io/geocoder/v1/${path}?${qs}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`Entur stedssøk svarte ${res.status}`);
  return res.json();
}
