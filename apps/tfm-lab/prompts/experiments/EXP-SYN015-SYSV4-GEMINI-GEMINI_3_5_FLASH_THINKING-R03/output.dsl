Requester:
(start Software purchase needed)
[Software Request]
[Business Justification Document]
[Estimated Budget]
user Submit request
Manager:
user Review request
Is request approved?
No
Requester:
user Inform requester of rejection
(finish Request Rejected by Manager)

Requester:
(start Software purchase needed)
[Software Request]
[Business Justification Document]
[Estimated Budget]
user Submit request
Manager:
user Review request
Is request approved?
Yes
Procurement:
Start sourcing process
[Request for Quotation]
send Request for Quotation
(receive Quote)
[Quote]
user Review quote
Is quote within budget?
No
Ask requester to reduce scope
Requester:
user Evaluate scope reduction
Is scope reduced?
No
Procurement:
send Opportunity Closed Notification
(finish Opportunity Closed)

Requester:
(start Software purchase needed)
[Software Request]
[Business Justification Document]
[Estimated Budget]
user Submit request
Manager:
user Review request
Is request approved?
Yes
Procurement:
Start sourcing process
[Request for Quotation]
send Request for Quotation
(receive Quote)
[Quote]
user Review quote
Is quote within budget?
No
Ask requester to reduce scope
Requester:
user Evaluate scope reduction
Is scope reduced?
Yes
Procurement:
send Revised Quote Request
(receive Revised Quote)
[Quote]
user Review quote
Is quote within budget?
Yes
//Note: Contract cannot be signed until both reviews are complete
IT Security: Review security questionnaire | Finance: Confirm budget availability
...

Requester:
(start Software purchase needed)
[Software Request]
[Business Justification Document]
[Estimated Budget]
user Submit request
Manager:
user Review request
Is request approved?
Yes
Procurement:
Start sourcing process
[Request for Quotation]
send Request for Quotation
(receive Quote)
[Quote]
user Review quote
Is quote within budget?
Yes
//Note: Contract cannot be signed until both reviews are complete
IT Security: Review security questionnaire | Finance: Confirm budget availability
...

...
IT Security: Review security questionnaire
Are there critical risks?
No
IT Security: Complete security review
...

...
IT Security: Review security questionnaire
Are there critical risks?
Yes
Procurement:
user Inform requester of security rejection
send Security Rejection Notification
(finish Rejected for Security Reasons)

...
Finance: Confirm budget availability
Finance: Complete budget confirmation
...

...
Finance: Confirm budget availability
(deadline 5 business days)
Procurement:
user Notify requester of expiration
(finish Request Expired)

...
IT Security: Complete security review | Finance: Complete budget confirmation
Procurement:
[Purchase Recommendation]
user Prepare purchase recommendation
Manager:
user Give final approval
Procurement:
send Purchase Order
(receive Order Confirmation)
[Signed Documents]
[db Contract Repository]
user Record signed documents in contract repository
Requester:
user Inform requester of approval and order
(finish Purchase Approved and Ordered)

Supplier:
(receive Request for Quotation)
send Quote
(receive Revised Quote Request)
send Revised Quote
(receive Purchase Order)
send Order Confirmation

Supplier:
(receive Request for Quotation)
send Quote
(receive Purchase Order)
send Order Confirmation

Supplier:
(receive Request for Quotation)
send Quote
(receive Opportunity Closed Notification)

Supplier:
(receive Request for Quotation)
send Quote
(receive Security Rejection Notification)