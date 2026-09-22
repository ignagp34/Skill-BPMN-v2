(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
No
Manager: Inform requester of rejection
(finish Software request rejected by manager)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Will requester reduce scope?
No
Procurement: send Opportunity closed notice
Supplier: receive Opportunity closed notice
(finish Opportunity closed)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Will requester reduce scope?
Yes
Requester: Reduce requested scope
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Security critical risk
Procurement: Inform requester of security rejection
Procurement: send Supplier rejection notice
Supplier: receive Supplier rejection notice
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Will requester reduce scope?
Yes
Requester: Reduce requested scope
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Budget not confirmed within five business days
(timer 5 business days)
Procurement: Notify requester of request expiration
(finish Request expired)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Will requester reduce scope?
Yes
Requester: Reduce requested scope
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
[Purchase recommendation]
Manager: Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: Record signed documents
[db Contract repository]
Procurement: Inform requester purchase approved and ordered
(finish Software purchase approved and ordered)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Security critical risk
Procurement: Inform requester of security rejection
Procurement: send Supplier rejection notice
Supplier: receive Supplier rejection notice
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Budget not confirmed within five business days
(timer 5 business days)
Procurement: Notify requester of request expiration
(finish Request expired)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: Review supplier quote
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Check budget availability
Are both reviews successful?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
[Purchase recommendation]
Manager: Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: Record signed documents
[db Contract repository]
Procurement: Inform requester purchase approved and ordered
(finish Software purchase approved and ordered)