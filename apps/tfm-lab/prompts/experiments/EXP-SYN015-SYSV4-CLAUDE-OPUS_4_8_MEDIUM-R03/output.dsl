(start Software needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
No
Procurement: Inform requester of rejection
(finish Request rejected by manager)

(start Software needed)
Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is the request approved?
Yes
Procurement: send Request for Quotation
Procurement: Review quote
Is the quote within budget?
Yes
...

Procurement: send Request for Quotation
Supplier: (receive Request for Quotation)
Supplier: send Quote

Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
No
Procurement: Inform supplier opportunity is closed
(finish Opportunity closed)

Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
Yes
Procurement: send Revised Quote Request
Procurement: Review quote

Supplier: (receive Revised Quote Request)
Supplier: send Revised Quote

...
Is the quote within budget?
Yes
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase Order
Procurement: Record signed documents
[db Contract Repository]
Procurement: Inform requester purchase approved and ordered
(finish Software purchase approved and ordered)

...
Is the quote within budget?
Yes
IT Security: Review supplier security questionnaire
Did IT security find a critical risk?
Yes
Procurement: Inform requester rejected for security reasons
Procurement: Notify supplier
(finish Request rejected for security reasons)

...
Is the quote within budget?
Yes
Finance: Confirm budget availability
((deadline 5 business days))
Procurement: Notify requester request expired
(finish Request expired)

Procurement: send Purchase Order
Supplier: (receive Purchase Order)
Supplier: send Order Confirmation

...
Procurement: send Purchase Order
Procurement: (receive Order Confirmation)
Procurement: Record signed documents
...
