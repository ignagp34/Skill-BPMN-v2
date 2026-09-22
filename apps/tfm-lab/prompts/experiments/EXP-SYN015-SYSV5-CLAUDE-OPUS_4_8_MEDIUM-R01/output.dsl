(start Software tool needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
No
Requester: Inform requester of rejection
(finish Request rejected by manager)

(start Software tool needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
Yes
Procurement: Start sourcing process
(send Request for Quotation)
(receive Supplier Quote)
Procurement: Review quote
Is the quote within budget?
...

...
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
No
Procurement: Inform supplier opportunity is closed
(send Opportunity Closed)
(finish Opportunity closed - over budget)

...
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
Yes
Procurement: Request revised quote
(send Request for Revised Quote)
(receive Revised Quote)
Procurement: Review quote
...

...
Is the quote within budget?
Yes
IT Security: Review security questionnaire|Finance: Confirm budget availability
//Contract cannot be signed until both reviews are complete
...

...
IT Security: Review security questionnaire
Did IT security find a critical risk?
Yes
Procurement: Reject request for security reasons
Procurement: Notify supplier of rejection
(send Security Rejection)
(finish Request rejected for security)

...
Finance: Confirm budget availability
((deadline 5 business days))
Procurement: Notify requester of expiry
(finish Request expired - budget not confirmed)

...
IT Security: Review security questionnaire|Finance: Confirm budget availability
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: Send purchase order
(send Purchase Order)
(receive Order Confirmation)
Procurement: Record signed documents
[db Contract Repository]
Procurement: Inform requester purchase approved
(finish Software purchased and ordered)

Supplier: (receive Request for Quotation)
Supplier: Prepare quote
(send Supplier Quote)

Supplier: (receive Request for Revised Quote)
Supplier: Prepare revised quote
(send Revised Quote)

Supplier: (receive Opportunity Closed)

Supplier: (receive Security Rejection)

Supplier: (receive Purchase Order)
Supplier: Confirm order
(send Order Confirmation)

== pools ==
Company -> Requester; Manager; Procurement; IT Security; Finance
Supplier -> Supplier
