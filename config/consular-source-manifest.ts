export type ConsularSourceManifestEntry = {
  id: string;
  label: string;
  url: string;
  parserHint: string;
};

export const consularSourceManifest: ConsularSourceManifestEntry[] = [
  {
    id: "eu-common-fees",
    label: "European Commission common visa fees",
    url: "https://home-affairs.ec.europa.eu/policies/schengen-borders-and-visa/visa-policy/how-apply-schengen-visa_en",
    parserHint: "Extract adult, child-age-6-to-11, and under-6 fee references plus general filing guidance.",
  },
  {
    id: "vfs-france-india",
    label: "VFS France India",
    url: "https://visa.vfsglobal.com/ind/en/fra/",
    parserHint: "Capture appointment lead-time and France submission-routing cues.",
  },
  {
    id: "vfs-germany-india",
    label: "VFS Germany India",
    url: "https://visa.vfsglobal.com/ind/en/deu/",
    parserHint: "Capture appointment lead-time and Germany jurisdiction-routing cues.",
  },
  {
    id: "bls-spain-india",
    label: "BLS Spain India",
    url: "https://india.blsspainvisa.com/",
    parserHint: "Capture Spain fee mentions, jurisdiction notes, and slot-lead indicators.",
  },
];