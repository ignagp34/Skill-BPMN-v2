(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
No
Requester: user Receive request rejection
(finish Software request rejected by manager)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
No
Requester: user Decide whether to reduce scope
Reduce scope?
No
Procurement: (send Opportunity closed)
(finish Software sourcing opportunity closed)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
Yes
[Supplier security questionnaire]
[Estimated budget]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Critical security risk found?
Yes
Procurement: user Inform requester of security rejection
Procurement: (send Security rejection notification)
(finish Software request rejected for security reasons)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
Yes
[Supplier security questionnaire]
IT Security: user Review supplier security questionnaire|Finance: (timer 5 business days)
Procurement: user Expire software request
Procurement: user Notify requester of expiration
(finish Software request expired)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
Yes
[Supplier security questionnaire]
[Estimated budget]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Critical security risk found?
No
//The contract cannot be signed until both reviews are complete
Procurement: user Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: (send Purchase order)
Procurement: (receive Order confirmation)
[Signed documents]
Procurement: user Record signed documents
[db Contract repository]
Requester: user Receive purchase approval and order notice
(finish Software purchase approved and ordered)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
No
Requester: user Decide whether to reduce scope
Reduce scope?
Yes
Procurement: (send Revised quote request)
Procurement: (receive Revised supplier quote)
Procurement: user Review revised supplier quote
[Supplier security questionnaire]
[Estimated budget]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Critical security risk found?
Yes
Procurement: user Inform requester of security rejection
Procurement: (send Security rejection notification)
(finish Software request rejected for security reasons)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
No
Requester: user Decide whether to reduce scope
Reduce scope?
Yes
Procurement: (send Revised quote request)
Procurement: (receive Revised supplier quote)
Procurement: user Review revised supplier quote
[Supplier security questionnaire]
IT Security: user Review supplier security questionnaire|Finance: (timer 5 business days)
Procurement: user Expire software request
Procurement: user Notify requester of expiration
(finish Software request expired)

(start Software request initiated)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Manager approves request?
Yes
Procurement: user Start sourcing process
Procurement: (send Request for quotation)
Procurement: (receive Supplier quote)
Procurement: user Review supplier quote
Quoted amount within budget?
No
Requester: user Decide whether to reduce scope
Reduce scope?
Yes
Procurement: (send Revised quote request)
Procurement: (receive Revised supplier quote)
Procurement: user Review revised supplier quote
[Supplier security questionnaire]
[Estimated budget]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Critical security risk found?
No
//The contract cannot be signed until both reviews are complete
Procurement: user Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: (send Purchase order)
Procurement: (receive Order confirmation)
[Signed documents]
Procurement: user Record signed documents
[db Contract repository]
Requester: user Receive purchase approval and order notice
(finish Software purchase approved and ordered)

Supplier: (receive Request for quotation)
Supplier: user Prepare supplier quote
Supplier: (send Supplier quote)

Supplier: (receive Revised quote request)
Supplier: user Prepare revised supplier quote
Supplier: (send Revised supplier quote)

Supplier: (receive Opportunity closed)
Supplier: user Close sourcing opportunity
(finish Opportunity closure recorded)

Supplier: (receive Security rejection notification)
Supplier: user Record security rejection
(finish Security rejection recorded)

Supplier: (receive Purchase order)
Supplier: user Process purchase order
Supplier: (send Order confirmation)

== pools ==
Company -> Requester; Manager; Procurement; IT Security; Finance
Supplier Organization -> Supplier
