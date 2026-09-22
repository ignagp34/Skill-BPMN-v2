[Business justification document]
[Estimated budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
No
Manager: send Request rejected
Requester: receive Request rejected
(finish Request rejected)

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
Procurement: Review quote and check budget
Is quote within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Requester: Decide whether to reduce scope
Should scope be reduced?
No
Requester: send Scope reduction declined
Procurement: receive Scope reduction declined
Procurement: send Opportunity closed
Supplier: receive Opportunity closed
(finish Opportunity closed)

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
Procurement: Review quote and check budget
Is quote within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Requester: Decide whether to reduce scope
Should scope be reduced?
Yes
Requester: send Scope reduction accepted
Procurement: receive Scope reduction accepted
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised quote
Procurement: receive Revised quote
[Revised quote]
Procurement: Review quote and check budget
Is quote within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Does IT security find a critical risk?
No
Is budget availability confirmed?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: Record signed documents
[db Contract repository]
Procurement: send Software purchase approved and ordered
Requester: receive Software purchase approved and ordered
(finish Software purchase approved and ordered)

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
Procurement: Review quote and check budget
Is quote within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Does IT security find a critical risk?
Yes
Procurement: send Security rejection notice for requester
Requester: receive Security rejection notice for requester
Procurement: send Security rejection notice for supplier
Supplier: receive Security rejection notice for supplier
(finish Security rejection)

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
Procurement: Review quote and check budget
Is quote within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
(deadline 5 business days)
Procurement: send Request expired
Requester: receive Request expired
(finish Request expired)

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
Procurement: Review quote and check budget
Is quote within budget?
Yes
[Supplier security questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Does IT security find a critical risk?
No
Is budget availability confirmed?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: Record signed documents
[db Contract repository]
Procurement: send Software purchase approved and ordered
Requester: receive Software purchase approved and ordered
(finish Software purchase approved and ordered)
