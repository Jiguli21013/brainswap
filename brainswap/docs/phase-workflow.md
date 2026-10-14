# Saved workflow request

The opening status below describes the start of this continuation. Current progress is recorded in content-verification-report.json and continuation.md.

Continue the BrainSwap project from the latest saved checkpoint.

CURRENT STATUS:
- Total cards: 594
- Cards with complete text: 250
- Remaining cards: 344
- Last completed card: ID 250
- Next card: ID 251
- Image metadata checked: 208
- Images visually inspected: 15
- Fully independently fact-checked cards: 0
- Integration tests: passing
- Production website: unchanged

IMPORTANT:
Do not restart the project.
Do not reimport the original JSON.
Do not overwrite or regenerate cards 1–250.
Preserve all existing content, IDs, ordering, and UI/UX.

We are switching to a new workflow with three phases.

==================================================
PHASE 1 — COMPLETE ALL REMAINING TEXT CONTENT
==================================================

Continue from ID 251 through ID 594.

Work in batches of 25–50 cards.

For every card, complete:

1. Correct name and identity.
2. Accurate role or occupation.
3. Five individually relevant English adjectives.
4. One unique, natural B1–B2 discussion question.
5. A 40–70-word biography.
6. Three notable works or contributions.
7. Three interesting, meaningful, source-supported facts.
8. Reliable source references.
9. Relevant fictional-character metadata where applicable.

CONTENT REQUIREMENTS:

- All text must be in natural English.
- Questions must be unique and specific.
- Avoid generic adjectives and repeated templates.
- Verify that works belong to the correct person.
- Distinguish fictional characters from real people.
- Do not invent facts, achievements, dates, or sources.
- Preserve the existing canonical JSON structure.

After each batch:
- Save data/cards.json.
- Run validation.
- Run integration tests.
- Update verification reports.
- Record the last completed ID.

Continue automatically until ID 594.

Do not stop between batches to ask for confirmation.

If execution limits are reached, save progress and provide
the next starting ID.

PHASE 1 IS COMPLETE WHEN:
- All 594 cards contain complete text.
- Every card has five adjectives.
- Every card has one unique question.
- Every card has a biography.
- Every card has three works/contributions.
- Every card has three interesting facts.
- No text fields contain placeholders.

Do not claim that generated content has been independently
fact-checked unless it has actually been verified.

==================================================
PHASE 2 — ADD IMAGES TO ALL 594 CARDS
==================================================

Start this phase only after Phase 1 is complete.

Your task is to find and integrate an appropriate image
for every card.

IMAGE REQUIREMENTS:

1. The image must represent the correct person or character.
2. The image URL must work.
3. Prefer Wikimedia Commons and other appropriately licensed sources.
4. Check image metadata and identity.
5. Record image source, author, license, and attribution.
6. Verify the image visually when inspection is available.
7. Preserve existing verified images.
8. Do not replace correct images unnecessarily.
9. Do not use unrelated images as placeholders.
10. Do not invent image URLs or licensing information.

SPECIAL CASES:

Musical groups:
Use a photograph of the group rather than an unrelated member.

Fictional characters:
Use an appropriately licensed image of the actual character.
If suitable reusable artwork is unavailable, keep a clearly
labeled fallback and record the reason.

Historical figures:
Paintings, illustrations, and sculptures are acceptable
when correctly identified and appropriately licensed.

Ambiguous identities:
Verify the intended identity before selecting an image.

Examples:
- P!nk
- Prince
- Sting
- Thor
- Loki
- The Joker
- Elsa
- Anna
- Chip
- Dale

For every image, record:

{
  "imageUrl": "...",
  "imageSource": "...",
  "imageAuthor": "...",
  "imageLicense": "...",
  "imageAttribution": "...",
  "imageVerificationStatus": "..."
}

Adapt these fields to the existing project schema rather
than introducing incompatible duplicates.

Never mark an image as visually verified unless it was
actually inspected.

Do not use copyrighted images without appropriate
permission or another valid legal basis.

If an appropriate image cannot be found:
- Preserve the fallback.
- Record the unresolved image issue.
- Continue with the next card.

PHASE 2 IS COMPLETE WHEN:
- All 594 cards have been individually checked for images.
- All available appropriate images have been integrated.
- Remaining missing images are documented.
- Image metadata and attribution are stored.
- The website handles missing images gracefully.

Do not claim that all 594 images are complete if
some cards still use fallbacks.

==================================================
PHASE 3 — BUILD A MANUAL REVIEW MODE
==================================================

After finishing the image pass, implement a manual
review mode for the website.

This mode will allow the project owner to manually
inspect every card and report errors.

IMPORTANT:
Preserve the existing public website design and behavior.

The review interface should be available only when
explicitly enabled, for example:

index.html?review=true

Normal visitors must not see review controls.

REQUIRED FEATURES:

1. CARD ID DISPLAY

Display the current card number:

Card 251 / 594

2. SEQUENTIAL NAVIGATION

Add:
- Previous card
- Next card

Review mode must navigate sequentially by ID,
not randomly.

3. JUMP TO CARD

Add a numeric input:

Go to card ID: [___] [Go]

Validate the entered ID.

4. MARK AS REVIEWED

Add a button:

"Mark as reviewed"

The user should be able to mark individual cards
as manually reviewed.

5. REVIEW STATUS

Each card should have one of these statuses:

- Not reviewed
- Reviewed — OK
- Needs correction

6. REPORT AN ISSUE

Add a button:

"Report issue"

Allow the user to select one or more issue types:

- Wrong image
- Incorrect name
- Incorrect biography
- Incorrect adjectives
- Poor question
- Incorrect notable works
- Incorrect interesting facts
- Other

Allow an optional text description.

7. SAVE REVIEW PROGRESS

Use localStorage to preserve:

- Reviewed card IDs.
- Cards requiring correction.
- Issue categories.
- Issue descriptions.
- Last viewed card ID.

Progress must survive page reloads.

Do not overwrite the canonical card data.

8. REVIEW DASHBOARD

Display:

Total cards: 594
Reviewed: X
Approved: X
Needs correction: X
Not reviewed: X

9. FILTERING

Allow the user to view:

- All cards
- Not reviewed
- Approved
- Needs correction

10. EXPORT REVIEW RESULTS

Add an "Export issues" button.

Export a JSON file containing all cards marked
as needing correction.

Example:

{
  "project": "BrainSwap",
  "issues": [
    {
      "cardId": 127,
      "name": "Example Name",
      "issueTypes": ["wrong_image", "incorrect_biography"],
      "description": "The image belongs to another person."
    }
  ]
}

Also provide an option to export all review progress
so that approved cards and the current position can
be restored later.

11. IMPORT REVIEW PROGRESS

Allow the user to import a previously exported
review-progress JSON file.

Validate the imported data before applying it.

Do not silently discard existing review progress.

12. REVIEW UI/UX

The review interface must be:

- Clean and minimal.
- Easy to use.
- Responsive on mobile and desktop.
- Visually consistent with BrainSwap.
- Accessible using keyboard controls.

Review controls must not interfere with the
existing card layout.

==================================================
PHASE 4 — VALIDATION AND REPORTING
==================================================

After completing the three phases:

Run:

python3 scripts/validate.py
node scripts/test-integration.mjs
python3 scripts/report.py

Update:

docs/content-verification-report.md
docs/content-verification-report.json

Report:

- Total cards with complete text.
- Total cards with images.
- Total cards using image fallbacks.
- Total images metadata-verified.
- Total images visually inspected.
- Total cards independently fact-checked.
- Remaining validation errors.
- Remaining unresolved issues.
- Manual review mode test results.

Test the website in a real browser at:

- 390px mobile width
- 768px tablet width
- 1440px desktop width

Test:

- Normal browsing.
- Random card selection.
- Sequential review navigation.
- Jump to ID.
- Review status persistence.
- Issue reporting.
- JSON export.
- JSON import.
- Keyboard navigation.
- Missing image handling.
- Page reload behavior.

==================================================
FINAL REQUIREMENTS
==================================================

Preserve all 594 cards.

Do not modify the existing public design unnecessarily.

Do not replace the production website.

Do not claim that unverified information is verified.

Do not invent facts or sources.

Do not lose existing progress.

Complete the phases in order.

If execution limits prevent completion:
- Save the current checkpoint.
- State the current phase.
- State the last completed card ID.
- State the next action.
- Update the reports.
- Provide continuation instructions.

Begin immediately with Phase 1, card ID 251.