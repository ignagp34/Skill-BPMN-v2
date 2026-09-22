Requester: (start Software procurement initiated)
[Software Request]
[Business Justification]
[Estimated Budget]
Requester: Submit software request
Manager: Review request
Is request approved?
Yes
Procurement: Start sourcing process
Procurement: (send Request for Quotation)
Procurement: (receive Supplier Quote)
Procurement: Review quote
Is quote within budget?
Yes
IT Security: Review security questionnaire|Finance: Confirm budget availability
...

Requester: (start Software procurement initiated)
[Software Request]
[Business Justification]
[Estimated Budget]
Requester: Submit software request
Manager: Review request
Is request approved?
No
Requester: (finish Procurement rejected by manager)

...
Procurement: Review quote
Is quote within budget?
No
Procurement: Ask requester to reduce scope
...

...
Procurement: Ask requester to reduce scope
Requester: Is scope reduction acceptable?
No
Procurement: (send Opportunity Closed Notification)
Requester: (finish Procurement cancelled due to budget)

...
Procurement: Ask requester to reduce scope
Requester: Is scope reduction acceptable?
Yes
Procurement: (send Revised Quote Request)
Procurement: (receive Supplier Quote)
...

...
IT Security: Review security questionnaire
Is there a critical security risk?
No
Procurement: Prepare purchase recommendation
...

...
IT Security: Review security questionnaire
Is there a critical security risk?
Yes
Procurement: Reject request for security reasons
Procurement: (send Security Rejection Notification)
Requester: (finish Procurement rejected for security reasons)

...
Finance: Confirm budget availability
Procurement: Prepare purchase recommendation
...

...
Finance: Confirm budget availability
(deadline 5 business days)
Procurement: Notify requester of expiration
Requester: (finish Request expired)

...
Procurement: Prepare purchase recommendation
//Note: Contract cannot be signed until both reviews are complete.
Manager: Approve purchase recommendation
Procurement: (send Purchase Order)
Procurement: (receive Order Confirmation)
[db Contract Repository]
Procurement: Record signed documents
Procurement: Inform requester of approval
Requester: (finish Software procurement completed)

Supplier: (receive Request for Quotation)
Supplier: Prepare quote
Supplier: (send Supplier Quote)
Supplier: (receive Purchase Order)
Supplier: (send Order Confirmation)
Supplier: (finish Supplier process completed)

...
Supplier: (send Supplier Quote)
Supplier: (receive Revised Quote Request)
Supplier: Prepare revised quote
Supplier: (send Supplier Quote)
...

...
Supplier: (send Supplier Quote)
Supplier: (receive Opportunity Closed Notification)
Supplier: (finish Supplier opportunity closed)

...
Supplier: (send Supplier Quote)
Supplier: (receive Security Rejection Notification)
Supplier: (finish Supplier opportunity closed)

== pools ==
Company -> Requester; Manager; Procurement; IT Security; Finance
Supplier Pool -> Supplier
