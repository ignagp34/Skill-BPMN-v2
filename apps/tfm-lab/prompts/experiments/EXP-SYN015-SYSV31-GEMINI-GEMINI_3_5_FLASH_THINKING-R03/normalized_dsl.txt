Requester:
[Software Request]
[Business Justification]
[Estimated Budget]
Submit Software Request

Manager:
Review Request
Is request approved?
No
Requester: receive Rejection Notification
(finish)

Requester:
Submit Software Request

Manager:
Review Request
Is request approved?
Yes
Procurement:
Start Sourcing Process
send Request for Quotation
Procurement: (receive Supplier's Quote)
Procurement: Review Quote and Check Budget
Is quote within budget?
Yes
Procurement: Accept Quote
...

...
Procurement:
Review Quote and Check Budget
Is quote within budget?
No
Procurement: Ask Requester to Reduce Scope
Requester: Decides on Scope Reduction
Is scope reduced?
No
Procurement: send Opportunity Closed
(finish)

...
Procurement:
Review Quote and Check Budget
Is quote within budget?
No
Procurement: Ask Requester to Reduce Scope
Requester: Decides on Scope Reduction
Is scope reduced?
Yes
Procurement: send Request for Revised Quote
Procurement: (receive Revised Quote)
Procurement: Review Quote and Check Budget
...

...
Procurement:
Accept Quote
IT Security: Review Supplier Security Questionnaire|Finance: Confirm Budget Availability
...

...
IT Security:
[Supplier Security Questionnaire]
Review Supplier Security Questionnaire
Is security risk critical?
No
Procurement: Prepare Purchase Recommendation
...

...
IT Security:
[Supplier Security Questionnaire]
Review Supplier Security Questionnaire
Is security risk critical?
Yes
Procurement: Inform Requester of Security Rejection
Procurement: send Security Rejection to Supplier
(finish)

...
Finance:
Confirm Budget Availability
Procurement: Prepare Purchase Recommendation
...

...
Finance: Confirm Budget Availability
(deadline 5 business days)
Procurement: Notify Requester of Expiration
(finish)

...
Procurement:
//Contract cannot be signed until both reviews are complete
Prepare Purchase Recommendation
Manager: Give Final Approval
Procurement: send Purchase Order
[Purchase Order]
Procurement: (receive Order Confirmation)
[Order Confirmation]
Procurement: Record Signed Documents
[db Contract Repository]
Requester: Receive Purchase Approval Notification
(finish)

Supplier:
(receive Request for Quotation)
send Supplier's Quote

Supplier:
(receive Request for Revised Quote)
send Revised Quote

Supplier:
(receive Opportunity Closed)

Supplier:
(receive Security Rejection to Supplier)

Supplier:
(receive Purchase Order)
send Order Confirmation