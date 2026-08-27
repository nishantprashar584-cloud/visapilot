import { expect, test, type Locator } from "@playwright/test";
import AdmZip from "adm-zip";

async function setNativeValue(
  locator: Locator,
  value: string,
) {
  await locator.evaluate((element: HTMLInputElement | HTMLTextAreaElement, nextValue: string) => {
    const field = element as HTMLInputElement | HTMLTextAreaElement;
    const prototype = Object.getPrototypeOf(field) as HTMLInputElement | HTMLTextAreaElement;
    const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

    descriptor?.set?.call(field, nextValue);
    field.dispatchEvent(new Event("input", { bubbles: true }));
    field.dispatchEvent(new Event("change", { bubbles: true }));
    field.dispatchEvent(new Event("blur", { bubbles: true }));
  }, value);
}

test.describe("VisaPilot application wizard", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(window, "SpeechRecognition", {
        configurable: true,
        value: undefined,
      });
      Object.defineProperty(window, "webkitSpeechRecognition", {
        configurable: true,
        value: undefined,
      });
    });

    await page.route("**/api/parse-document", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            documentType: "passport",
            full_name: "Elena Vance",
            passport_number: "XK9981224",
            date_of_birth: "1993-03-14",
            nationality: "British",
            expiry_date: "2029-12-31",
          },
        }),
      });
    });

    await page.route("**/api/parse-voice-context", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          result: {
            transcript:
              "Hi, I'm Elena Vance, a freelance designer going to Madrid for 10 days from September 15th to 25th. I'm paying for everything myself with my savings, staying at the Hotel Riu Plaza Espana.",
            destinationCountry: "Spain",
            firstEntryCountry: "Spain",
            tripPurpose: "tourism",
            employmentStatus: "self_employed",
            fundingSource: "self_funded",
            arrivalDate: "2026-09-15",
            departureDate: "2026-09-25",
            accommodationSummary: "Hotel Riu Plaza Espana, Madrid.",
            hostContext: "Two active client contracts remain live after return.",
            returnTieSignal: "Freelance client deliverables and primary residence obligations require return after the trip.",
            specialCircumstances: "Visiting Madrid for 10 days and staying at Hotel Riu Plaza Espana.",
          },
        }),
      });
    });

    await page.route("**/api/generate-cover-letter", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          coverLetterMarkdown:
            "Dear Visa Officer,\n\nI am Elena Vance, a freelance software developer traveling to Madrid from 15 September 2026 to 25 September 2026. I am self-funding this trip with EUR 2500 in available savings, and I am enclosing active client contracts to confirm my return to the United Kingdom after travel.\n\nSincerely,\nElena Vance",
          source: "openai",
        }),
      });
    });
  });

  test("completes the preview wizard flow and verifies the downloaded package", async ({ page }) => {
    const firstNameInput = page.locator('[name="personal.firstName"]');
    const lastNameInput = page.locator('[name="personal.lastName"]');
    const dateOfBirthInput = page.locator('[name="personal.dateOfBirth"]');
    const placeOfBirthInput = page.locator('[name="personal.placeOfBirth"]');
    const countryOfBirthInput = page.locator('[name="personal.countryOfBirth"]');
    const currentNationalityInput = page.locator('[name="personal.currentNationality"]');
    const emailInput = page.locator('[name="contact.email"]');
    const phoneInput = page.locator('[name="contact.phone"]');
    const addressLine1Input = page.locator('[name="contact.addressLine1"]');
    const cityInput = page.locator('[name="contact.city"]');
    const postalCodeInput = page.locator('[name="contact.postalCode"]');
    const contactCountryInput = page.locator('[name="contact.country"]');
    const passportNumberInput = page.locator('[name="passport.number"]');
    const passportIssueDateInput = page.locator('[name="passport.dateOfIssue"]');
    const passportExpiryInput = page.locator('[name="passport.dateOfExpiry"]');
    const passportIssuedByInput = page.locator('[name="passport.issuedBy"]');
    const passportIssuingCountryInput = page.locator('[name="passport.issuingCountry"]');
    const destinationCountryInput = page.locator('[name="trip.destinationCountry"]');
    const firstEntryCountryInput = page.locator('[name="trip.firstEntryCountry"]');
    const portOfEntryInput = page.locator('[name="trip.portOfEntry"]');
    const purposeSelect = page.locator('[name="trip.purpose"]');
    const entriesRequestedSelect = page.locator('[name="trip.entriesRequested"]');
    const employmentStatusSelect = page.locator('[name="employment.employmentStatus"]');
    const fundingSourceSelect = page.locator('[name="sponsor.fundingSource"]');
    const entryDateInput = page.locator('[name="trip.arrivalDate"]');
    const exitDateInput = page.locator('[name="trip.departureDate"]');
    const accommodationDetailsInput = page.locator('[name="trip.accommodations"]');
    const savingsInput = page.locator('[name="employment.savingsBalanceEur"]');
    const occupationInput = page.locator('[name="employment.occupation"]');
    const hotelReferenceInput = page.locator('[name="trip.hotelBookingReference"]');
    const propertyOwnershipSelect = page.locator('[name="homeTies.propertyOwnership"]');

    await page.goto("/apply?preview=1");

    await expect(page.getByRole("heading", { name: /step 1: passport & personal details/i })).toBeVisible({ timeout: 60000 });
    await expect(firstNameInput).toHaveValue("Aarav", { timeout: 60000 });
    await expect(lastNameInput).toHaveValue("Mehta");
    await expect(passportExpiryInput).toHaveValue("2031-02-09");

    await setNativeValue(firstNameInput, "Elena");
    await setNativeValue(lastNameInput, "Vance");
    await setNativeValue(dateOfBirthInput, "1993-03-14");
    await setNativeValue(placeOfBirthInput, "London");
    await setNativeValue(countryOfBirthInput, "United Kingdom");
    await setNativeValue(currentNationalityInput, "British");
    await setNativeValue(emailInput, "elena.vance@example.com");
    await setNativeValue(phoneInput, "447700900123");
    await setNativeValue(addressLine1Input, "221B Baker Street");
    await setNativeValue(cityInput, "London");
    await setNativeValue(postalCodeInput, "NW16XE");
    await setNativeValue(contactCountryInput, "United Kingdom");
    await setNativeValue(passportNumberInput, "XK9981224");
    await setNativeValue(passportIssueDateInput, "2019-01-15");
    await setNativeValue(passportExpiryInput, "2029-12-31");
    await setNativeValue(passportIssuedByInput, "HM Passport Office");
    await setNativeValue(passportIssuingCountryInput, "United Kingdom");

    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /travel details/i })).toBeVisible();
    await setNativeValue(destinationCountryInput, "Spain");
    await setNativeValue(firstEntryCountryInput, "Spain");
    await setNativeValue(portOfEntryInput, "Madrid");
    await purposeSelect.selectOption("tourism");
    await entriesRequestedSelect.selectOption("single");
    await employmentStatusSelect.selectOption("self_employed");
    await fundingSourceSelect.selectOption("self_funded");
    await setNativeValue(entryDateInput, "2026-09-15");
    await setNativeValue(exitDateInput, "2026-09-25");
    await setNativeValue(accommodationDetailsInput, "Hotel Riu Plaza Espana, Madrid.");
    await page.getByRole("button", { name: /^yes$/i }).first().click();
    await page.getByLabel(/^valid from$/i).fill("2024-05-01");
    await page.getByLabel(/^valid to$/i).fill("2024-05-20");
    await page.getByLabel(/visa sticker number/i).first().fill("FRA987654321");
    await page.getByRole("button", { name: /^yes$/i }).nth(1).click();
    await page.getByLabel(/approximate collection date or year/i).fill("2024-05-01");
    await page.getByLabel(/previous visa sticker number/i).fill("FRA987654321");
    await expect(page.getByLabel(/^valid from$/i)).toHaveCount(1);
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /finances and employment/i })).toBeVisible();
    await setNativeValue(savingsInput, "800");
    await expect(page.getByText(/insufficient statutory funds for spain/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save and continue/i })).toBeDisabled();
    await setNativeValue(savingsInput, "2500");
    await expect(page.getByText(/strong financial health/i)).toBeVisible();
    await expect(page.getByText(/220% safety margin/i)).toBeVisible();
    await expect(page.getByRole("button", { name: /save and continue/i })).toBeEnabled();
    await setNativeValue(occupationInput, "Freelance Software Developer");
    await setNativeValue(page.locator('[name="employment.monthlyIncomeEur"]'), "4200");
    await page.getByRole("button", { name: /save and continue/i }).click();

    await expect(page.getByRole("heading", { name: /accommodations & home ties/i })).toBeVisible();
    await setNativeValue(hotelReferenceInput, "BLS-MAD-99821");
    await propertyOwnershipSelect.selectOption("owned");
    await setNativeValue(page.locator('[name="trip.accommodations"]'), "Hotel Riu Plaza Espana, Madrid.");
    await setNativeValue(page.locator('[name="homeTies.returnIntentEvidence"]'), "Active client contracts and a permanent residence in London require prompt return after travel.");
    await setNativeValue(page.locator('[name="application.placeOfApplication"]'), "London");
    await expect(page.getByText(/passes 3-month expiry rule/i)).toBeVisible();
    await page.getByRole("button", { name: /continue to document studio/i }).click();

    await expect(page.getByRole("heading", { name: /^document studio$/i }).first()).toBeVisible();
    await expect(page.getByText(/spain appointment-ready packet guide/i)).toBeVisible();
    await expect(page.getByText(/provider:\s*bls international/i)).toBeVisible();
    await page.getByRole("button", { name: /ai cover letter/i }).click();
    await page.getByRole("button", { name: /^generate$/i }).click();
    await expect(page.getByText(/cover letter draft generated/i)).toBeVisible();
    await expect(page.getByRole("textbox", { name: /generate or edit the final/i })).toHaveValue(/freelance software developer/i);
    await page.getByRole("button", { name: /open sample package/i }).click();

    await expect(page).toHaveURL(/\/dashboard\/preview-spain-repair\?preview=1/);
    await expect(page.getByRole("heading", { name: /sara khan/i })).toBeVisible();

    const packageLink = page.getByRole("link", { name: /download full package \(.zip\)/i });
    await expect(packageLink).toBeVisible();
    const packageHref = await packageLink.getAttribute("href");

    expect(packageHref).toBeTruthy();

    const packageResponse = await page.request.get(packageHref!);
    expect(packageResponse.ok()).toBeTruthy();

    const archive = new AdmZip(Buffer.from(await packageResponse.body()));
    const entryNames = archive.getEntries().map((entry) => entry.entryName);

    expect(entryNames).toContain("schengen_application_spain.pdf");
    expect(entryNames).toContain("Consulate_Submission_Checklist.pdf");
    expect(entryNames).toContain("Schengen_Cover_Letter.pdf");
  });
});