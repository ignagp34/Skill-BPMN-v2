(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
No
Manager: Inform requester of rejected software request
(finish Request rejected by manager)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
Yes
Procurement: Start sourcing process
Procurement: send request for quotation
Procurement: receive supplier quote
[Supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
No
Procurement: Ask requester whether scope should be reduced
Should scope be reduced?
No
Procurement: send opportunity closed notice
(finish Opportunity closed with supplier)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
Yes
Procurement: Start sourcing process
Procurement: send request for quotation
Procurement: receive supplier quote
[Supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
Yes
Procurement: Inform requester of security rejection
Procurement: send security rejection notice
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
Yes
Procurement: Start sourcing process
Procurement: send request for quotation
Procurement: receive supplier quote
[Supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
No
Is budget availability confirmed within five business days?
No
(timer 5 business days)
Procurement: Notify requester that request expired
(finish Request expired because budget was not confirmed)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
Yes
Procurement: Start sourcing process
Procurement: send request for quotation
Procurement: receive supplier quote
[Supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
No
Is budget availability confirmed within five business days?
Yes
[Budget confirmation]
Procurement: Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: send purchase order
Procurement: receive order confirmation
[Signed documents]
[db Contract repository]
Procurement: Record signed documents
[db Contract repository]
Procurement: Inform requester software purchase approved and ordered
(finish Software purchase approved and ordered)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does manager approve request?
Yes
Procurement: Start sourcing process
Procurement: send request for quotation
Procurement: receive supplier quote
[Supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
No
Procurement: Ask requester whether scope should be reduced
Should scope be reduced?
Yes
Procurement: send revised quote request
Procurement: receive revised supplier quote
[Revised supplier quote]
Procurement: Review supplier quote
Procurement: rule Check quoted amount against estimated budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
No
Is budget availability confirmed within five business days?
Yes
[Budget confirmation]
Procurement: Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: send purchase order
Procurement: receive order confirmation
[Signed documents]
[db Contract repository]
Procurement: Record signed documents
[db Contract repository]
Procurement: Inform requester software purchase approved and ordered
(finish Software purchase approved and ordered)

Supplier:
(receive request for quotation)
Prepare supplier quote
(send supplier quote)

Supplier:
(receive revised quote request)
Prepare revised supplier quote
(send revised supplier quote)

Supplier:
(receive opportunity closed notice)
(finish Opportunity closed by buyer)

Supplier:
(receive security rejection notice)
(finish Supplier notified of security rejection)

Supplier:
(receive purchase order)
Prepare order confirmation
(send order confirmation)