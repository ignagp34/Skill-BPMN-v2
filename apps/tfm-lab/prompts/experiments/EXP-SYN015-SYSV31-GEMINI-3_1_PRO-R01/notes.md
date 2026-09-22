line 18 [AP-7] Anchor 'Yes' is buried inside a fragment
line 43 [AP-7] Anchor 'Yes' is buried inside a fragment
line 66 [AP-7] Anchor 'Yes' is buried inside a fragment

The important bit: Yes / No after a ? are valid as branch labels, but Gemini surrounded too much with ... fragments. In this DSL, ... fragments need clean anchor tasks at the boundary. Gemini put fragments around decisions and parallel rows in a way that accidentally makes Yes behave like a fragment anchor. Then the same Yes appears inside other fragments, so the model breaks.

So: the business process idea is fine, but Gemini’s DSL is not reliable here. It is using fragments too aggressively.
