Requester: Submit Software Request
[Software Request]
[Business Justification]
[Estimated Budget]
Manager: Review Request
Is request approved?
No
Manager: Reject Request and Inform Requester
(finish)

Requester: Submit Software Request
[Software Request]
[Business Justification]
[Estimated Budget]
Manager: Review Request
Is request approved?
Yes
Procurement: Start Sourcing Process
[Request for Quotation]
Procurement: send Request for Quotation
Procurement: (receive Supplier Quote)
[Supplier Quote]
Procurement: Review Quote and Check Budget
Is quote within budget?
No
Procurement: Ask Requester to Reduce Scope
Requester: Decide on Scope Reduction
Agree to reduce scope?
No
Procurement: send Opportunity Closed Notification
(finish)

Requester: Submit Software Request
[Software Request]
[Business Justification]
[Estimated Budget]
Manager: Review Request
Is request approved?
Yes
Procurement: Start Sourcing Process
[Request for Quotation]
Procurement: send Request for Quotation
Procurement: (receive Supplier Quote)
[Supplier Quote]
Procurement: Review Quote and Check Budget
Is quote within budget?
No
Procurement: Ask Requester to Reduce Scope
Requester: Decide on Scope Reduction
Agree to reduce scope?
Yes
Procurement: send Revised Quote Request
Procurement: (receive Supplier Quote)

Requester: Submit Software Request
[Software Request]
[Business Justification]
[Estimated Budget]
Manager: Review Request
Is request approved?
Yes
Procurement: Start Sourcing Process
[Request for Quotation]
Procurement: send Request for Quotation
Procurement: (receive Supplier Quote)
[Supplier Quote]
Procurement: Review Quote and Check Budget
Is quote within budget?
Yes
IT Security: Review Security Questionnaire|Finance: Confirm Budget Availability
...

...
[Security Questionnaire]
IT Security: Review Security Questionnaire
IT Security: Critical risk found?
No
IT Security: Approve Security
...

...
[Security Questionnaire]
IT Security: Review Security Questionnaire
IT Security: Critical risk found?
Yes
Procurement: Inform Requester of Security Rejection
Procurement: send Security Rejection Notification
(terminate)

...
Finance: Confirm Budget Availability
(deadline 5 business days)
Procurement: Notify Requester of Expiry
(terminate)

...
IT Security: Approve Security|Finance: Confirm Budget Availability
//Note: The contract cannot be signed until both reviews are complete.
Procurement: Prepare Purchase Recommendation
Manager: Give Final Approval
Procurement: send Purchase Order
[Purchase Order]
Procurement: (receive Order Confirmation)
[Order Confirmation]
[Signed Documents]
Procurement: Record Signed Documents
[db Contract Repository]
Procurement: Inform Requester of Purchase Approval
(finish)

Supplier:
(receive Request for Quotation)
Supplier: Prepare Quote
Supplier: send Supplier Quote

Supplier:
(receive Revised Quote Request)
Supplier: Prepare Revised Quote
Supplier: send Supplier Quote

Supplier:
(receive Opportunity Closed Notification)

Supplier:
(receive Security Rejection Notification)

Supplier:
(receive Purchase Order)
Supplier: send Order Confirmation