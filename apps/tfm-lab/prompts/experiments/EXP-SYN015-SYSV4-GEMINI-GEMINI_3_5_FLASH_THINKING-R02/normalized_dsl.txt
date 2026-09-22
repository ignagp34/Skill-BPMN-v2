Requester:
(start Software tool needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit software request

Manager:
Review software request
Is request approved?
No
Procurement: Inform requester of rejection
(finish Request Rejected by Manager)

Requester:
(start Software tool needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit software request

Manager:
Review software request
Is request approved?
Yes
Procurement: Start sourcing process
Procurement: send Request for Quotation
Procurement: (receive Quote)
Procurement: Review quote and check budget
Procurement: Is quote within budget?
Yes
Procurement: Assess quote acceptability
...

Requester:
(start Software tool needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit software request

Manager:
Review software request
Is request approved?
Yes
Procurement: Start sourcing process
Procurement: send Request for Quotation
Procurement: (receive Quote)
Procurement: Review quote and check budget
Procurement: Is quote within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Should scope be reduced?
No
Procurement: send Opportunity closed notification
(finish Opportunity Closed)

Requester:
(start Software tool needed)
[Software Request]
[Business Justification]
[Estimated Budget]
Submit software request

Manager:
Review software request
Is request approved?
Yes
Procurement: Start sourcing process
Procurement: send Request for Quotation
Procurement: (receive Quote)
Procurement: Review quote and check budget
Procurement: Is quote within budget?
No
Procurement: Ask requester to reduce scope
Requester: Decide on scope reduction
Should scope be reduced?
Yes
Procurement: send Revised quote request
Procurement: (receive Revised quote)
Procurement: Assess quote acceptability
...

...
Procurement: Assess quote acceptability
IT security: Review security questionnaire|Finance: Confirm budget availability
...

...
IT security: Review security questionnaire
IT security: Is there a critical risk?
Yes
Procurement: Inform requester of security rejection
Procurement: send Security rejection to supplier
(finish Rejected for Security Reasons)

...
IT security: Review security questionnaire
IT security: Is there a critical risk?
No
IT security: Approve security review
...

...
Finance: Confirm budget availability
Finance: Confirm availability
...

...
Finance: Confirm budget availability
(deadline 5 business days)
Procurement: Expire request
Procurement: Notify requester of expiration
(finish Request Expired)

...
IT security: Approve security review|Finance: Confirm availability
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase Order
Procurement: (receive Order confirmation)
[Purchase Order]
[Order Confirmation]
Procurement: Record signed documents
[Signed Documents]
[db Contract Repository]
Procurement: Inform requester of approval and order
(finish Purchase Completed Successfully)

Supplier:
(receive Request for Quotation)
Supplier: send Quote
(finish Quote Sent)

Supplier:
(receive Revised quote request)
Supplier: send Revised quote
(finish Revised Quote Sent)

Supplier:
(receive Opportunity closed notification)
(finish Opportunity Closed)

Supplier:
(receive Security rejection to supplier)
(finish Rejected for Security Reasons)

Supplier:
(receive Purchase Order)
Supplier: send Order confirmation
(finish Order Confirmed by Supplier)