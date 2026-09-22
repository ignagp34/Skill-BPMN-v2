Requester:
[Software Request]
[Business Justification Document]
[Estimated Budget]
Submit Software Request

Manager:
Review Request
Is request approved?
No

Requester:
Receive Rejection Notification
(finish Request Rejected)

Requester:
[Software Request]
[Business Justification Document]
[Estimated Budget]
Submit Software Request

Manager:
Review Request
Is request approved?
Yes

Procurement:
Start Sourcing
send Request for Quotation
receive Supplier Quote
Review Quote
Is quote within budget?
Yes
//Contract cannot be signed until both reviews are complete
IT Security: Review Security Questionnaire | Finance: Confirm Budget Availability
Procurement:
Prepare Purchase Recommendation
Manager:
Give Final Approval
Procurement:
send Purchase Order
receive Order Confirmation
[Signed Documents]
[db Contract Repository]
Record Signed Documents in Contract Repository
Requester:
Receive Purchase Approved Notification
(finish Purchase Approved)

Requester:
[Software Request]
[Business Justification Document]
[Estimated Budget]
Submit Software Request

Manager:
Review Request
Is request approved?
Yes

Procurement:
Start Sourcing
send Request for Quotation
receive Supplier Quote
Review Quote
Is quote within budget?
No
Ask Requester to Reduce Scope

Requester:
Decide on Scope Reduction
Should scope be reduced?
Yes

Procurement:
send Revised Quote Request
receive Revised Supplier Quote
Review Quote
Is quote within budget?
Yes
//Contract cannot be signed until both reviews are complete
IT Security: Review Security Questionnaire | Finance: Confirm Budget Availability
Procurement:
Prepare Purchase Recommendation
Manager:
Give Final Approval
Procurement:
send Purchase Order
receive Order Confirmation
[Signed Documents]
[db Contract Repository]
Record Signed Documents in Contract Repository
Requester:
Receive Purchase Approved Notification
(finish Purchase Approved)

Requester:
[Software Request]
[Business Justification Document]
[Estimated Budget]
Submit Software Request

Manager:
Review Request
Is request approved?
Yes

Procurement:
Start Sourcing
send Request for Quotation
receive Supplier Quote
Review Quote
Is quote within budget?
No
Ask Requester to Reduce Scope

Requester:
Decide on Scope Reduction
Should scope be reduced?
No

Procurement:
send Closed Opportunity Notification
(finish Opportunity Closed)

...
IT Security:
Review Security Questionnaire
Is there a critical security risk?
Yes

Procurement:
Inform Requester of Security Rejection | send Security Rejection Notification
(finish Rejected for Security Reasons)

...
Finance:
Confirm Budget Availability
(deadline 5 days)

Procurement:
Notify Requester of Expiry
(finish Request Expired)

Supplier:
(receive Request for Quotation)
send Supplier Quote
(receive Purchase Order)
send Order Confirmation

Supplier:
(receive Request for Quotation)
send Supplier Quote
(receive Revised Quote Request)
send Revised Supplier Quote
(receive Purchase Order)
send Order Confirmation

...
Supplier: send Supplier Quote
(receive Closed Opportunity Notification)
(finish Opportunity Closed)

...
Supplier: send Supplier Quote
(receive Security Rejection Notification)
(finish Rejected for Security Reasons)