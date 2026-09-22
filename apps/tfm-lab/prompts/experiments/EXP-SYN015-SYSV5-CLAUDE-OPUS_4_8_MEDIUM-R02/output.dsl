(start Software tool needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
No
Procurement: Inform requester of rejection
(finish Request rejected by manager)

(start Software tool needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
Yes
Procurement: Start sourcing process
Procurement: (send Request for Quotation)
Procurement: (receive Supplier Quote)
Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
No
Procurement: (send Opportunity Closed)
(finish Opportunity closed - over budget)

(start Software tool needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
Yes
Procurement: Start sourcing process
Procurement: (send Request for Quotation)
Procurement: (receive Supplier Quote)
Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
Yes
Procurement: (send Revised Quote Request)
Procurement: (receive Revised Quote)
Procurement: Review quote
...

...
Procurement: Review quote
Is the quote within budget?
Yes
IT Security: Review security questionnaire|Finance: Confirm budget availability
...

...
IT Security: Review security questionnaire
//Contract cannot be signed until both reviews are complete
Did IT security find a critical risk?
Yes
Procurement: Reject request for security reasons
Procurement: (send Security Rejection Notice)
(finish Rejected for security reasons)

...
Finance: Confirm budget availability
((deadline 5 business days))
Procurement: Notify requester of expiry
(finish Request expired - budget not confirmed)

...
IT Security: Review security questionnaire|Finance: Confirm budget availability
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: (send Purchase Order)
Procurement: (receive Order Confirmation)
Procurement: Record signed documents
[db Contract Repository]
Procurement: Inform requester of approval
(finish Software purchase approved and ordered)

Supplier: (receive Request for Quotation)
Supplier: (send Supplier Quote)

Supplier: (receive Revised Quote Request)
Supplier: (send Revised Quote)

Supplier: (receive Opportunity Closed)

Supplier: (receive Security Rejection Notice)

Supplier: (receive Purchase Order)
Supplier: (send Order Confirmation)

== pools ==
Internal -> Requester; Manager; Procurement; IT Security; Finance
Supplier -> Supplier
