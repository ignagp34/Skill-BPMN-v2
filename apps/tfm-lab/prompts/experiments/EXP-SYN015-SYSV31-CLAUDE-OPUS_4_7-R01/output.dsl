Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is request approved?
No
Requester: send Rejection notice

Requester:
(receive Rejection notice)

Requester: Submit software request
[Business Justification]
[Estimated Budget]
Manager: Review request
Is request approved?
Yes
Procurement: send Request for quotation

Supplier:
(receive Request for quotation)
Supplier: Prepare quote
Supplier: send Quote

Procurement:
(receive Quote)
Procurement: Review quote
Is quote within budget?
Yes
//Contract cannot be signed until both reviews are complete
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order

Supplier:
(receive Purchase order)
Supplier: send Order confirmation

Procurement:
(receive Order confirmation)
[db Contract repository]
Procurement: Record signed documents
Procurement: send Purchase approved notice

Requester:
(receive Purchase approved notice)

...
Procurement: Review quote
Is quote within budget?
No
Requester: Decide on scope reduction
Should scope be reduced?
No
Procurement: send Opportunity closed notice

Supplier:
(receive Opportunity closed notice)

...
Requester: Decide on scope reduction
Should scope be reduced?
Yes
Procurement: send Request for revised quote

Supplier:
(receive Request for revised quote)
Supplier: Prepare revised quote
Supplier: send Revised quote

Procurement:
(receive Revised quote)
Procurement: Review quote
...

...
IT Security: Review supplier security questionnaire
(exception Critical security risk found)
Procurement: send Security rejection to requester
Procurement: send Security rejection to supplier

Requester:
(receive Security rejection to requester)

Supplier:
(receive Security rejection to supplier)

...
Finance: Confirm budget availability
(deadline 5 business days)
Procurement: send Request expired notice

Requester:
(receive Request expired notice)
