Requester: (start Procurement Needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit request
Manager: Review request
Is request approved?
Yes
Procurement: Start sourcing process
send Request for Quotation
(receive Quote)
[Quote]
Review quote
Is quote within budget?
Yes
IT security: Review supplier security questionnaire|Finance: Confirm budget availability
...

Requester: (start Procurement Needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit request
Manager: Review request
Is request approved?
No
Procurement: Inform requester of rejection
Requester: Receive rejection notification
(finish Request Rejected)

Requester: (start Procurement Needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit request
Manager: Review request
Is request approved?
Yes
Procurement: Start sourcing process
send Request for Quotation
(receive Quote)
[Quote]
Review quote
Is quote within budget?
No
Ask requester to reduce scope
Requester:
Review scope reduction
Should scope be reduced?
No
Procurement: send Opportunity Closed
(finish Procurement Cancelled)

Requester: (start Procurement Needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit request
Manager: Review request
Is request approved?
Yes
Procurement: Start sourcing process
send Request for Quotation
(receive Quote)
[Quote]
Review quote
Is quote within budget?
No
Ask requester to reduce scope
Requester:
Review scope reduction
Should scope be reduced?
Yes
Procurement: send Request for Revised Quotation
(receive Revised Quote)
[Revised Quote]
Review quote

...
IT security: Review supplier security questionnaire
Is there a critical security risk?
No
IT security: Complete security review
...

...
IT security: Review supplier security questionnaire
Is there a critical security risk?
Yes
Procurement: Inform requester of security rejection
Procurement: send Security Rejection Notification
Requester: Receive security rejection
(finish Rejected for Security)

...
Finance: Confirm budget availability
Finance: Complete finance review
...

...
Finance: Confirm budget availability
(deadline 5 business days)
Procurement: Notify requester of expiration
Requester: Receive expiration notification
(finish Request Expired)

...
IT security: Complete security review|Finance: Complete finance review
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase Order
(receive Order Confirmation)
[Order Confirmation]
[db Contract Repository]
Record signed documents in contract repository
[db Contract Repository]
Inform requester of approval
Requester: Receive approval notification
(finish Software Purchased)

Supplier:
(receive Request for Quotation)
Prepare quote
send Quote

Supplier:
(receive Request for Revised Quotation)
Prepare revised quote
send Revised Quote

Supplier:
(receive Opportunity Closed)
(finish Opportunity Closed)

Supplier:
(receive Security Rejection Notification)
(finish Rejected for Security)

Supplier:
(receive Purchase Order)
send Order Confirmation