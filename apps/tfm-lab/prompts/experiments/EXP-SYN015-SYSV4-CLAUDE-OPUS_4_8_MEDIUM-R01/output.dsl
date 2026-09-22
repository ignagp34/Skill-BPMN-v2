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
Procurement: Start sourcing process
Procurement: send Request for quotation
Procurement: receive Supplier quote
Procurement: Review quote
Is the quote within budget?
Yes
IT Security: Review security questionnaire|Finance: Confirm budget availability
...

...
Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
No
Procurement: send Opportunity closed
(finish Opportunity closed - over budget)

...
Procurement: Review quote
Is the quote within budget?
No
Procurement: Ask requester to reduce scope
Should the scope be reduced?
Yes
Procurement: send Revised quotation request
Procurement: receive Revised supplier quote
IT Security: Review security questionnaire|Finance: Confirm budget availability
...

//Contract cannot be signed until both reviews are complete
...
IT Security: Review security questionnaire
Did IT security find a critical risk?
Yes
Procurement: Inform requester of security rejection
Procurement: send Supplier security rejection notice
(finish Request rejected for security reasons)

...
Finance: Confirm budget availability
((deadline 5 business days))
Procurement: Notify requester of expiry
(finish Request expired - budget unconfirmed)

...
IT Security: Review security questionnaire|Finance: Confirm budget availability
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order
Supplier: send Order confirmation
Procurement: Record signed documents
[db Contract Repository]
Procurement: Inform requester of approval
(finish Software purchase approved and ordered)

Supplier:
(receive Request for quotation)
(send Supplier quote)

Supplier:
(receive Revised quotation request)
(send Revised supplier quote)

Supplier:
(receive Purchase order)
(send Order confirmation)
