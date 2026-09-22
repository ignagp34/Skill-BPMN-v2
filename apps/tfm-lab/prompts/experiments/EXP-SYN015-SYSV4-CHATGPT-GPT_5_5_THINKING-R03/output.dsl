(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
No
Manager: send Manager rejection notice
Requester: receive Manager rejection notice
(finish Request rejected by manager)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Does requester agree to reduce scope?
No
Requester: send Scope reduction declined
Procurement: receive Scope reduction declined
Procurement: send Opportunity closed notice
Supplier: receive Opportunity closed notice
(finish Opportunity closed after scope decline)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Critical security risk found
Procurement: send Security rejection notice
Requester: receive Security rejection notice
Procurement: send Supplier rejection notice
Supplier: receive Supplier rejection notice
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Budget not confirmed within five business days
(timer five business days)
Procurement: send Request expired notice
Requester: receive Request expired notice
(finish Request expired due to budget confirmation timeout)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Both reviews successful
Procurement: user Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: service Record signed documents in contract repository
[db Contract repository]
Procurement: send Purchase approved and ordered notice
Requester: receive Purchase approved and ordered notice
(finish Software purchase approved and ordered)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Does requester agree to reduce scope?
Yes
Requester: send Scope reduction accepted
Procurement: receive Scope reduction accepted
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Critical security risk found
Procurement: send Security rejection notice
Requester: receive Security rejection notice
Procurement: send Supplier rejection notice
Supplier: receive Supplier rejection notice
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Does requester agree to reduce scope?
Yes
Requester: send Scope reduction accepted
Procurement: receive Scope reduction accepted
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Budget not confirmed within five business days
(timer five business days)
Procurement: send Request expired notice
Requester: receive Request expired notice
(finish Request expired due to budget confirmation timeout)

(start Software request submitted)
[Business justification document]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Is manager approval granted?
Yes
Procurement: user Start sourcing process
Procurement: send Request for quotation
Supplier: receive Request for quotation
Supplier: send Supplier quote
Procurement: receive Supplier quote
[Supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
No
Procurement: send Scope reduction question
Requester: receive Scope reduction question
Does requester agree to reduce scope?
Yes
Requester: send Scope reduction accepted
Procurement: receive Scope reduction accepted
Procurement: send Revised quote request
Supplier: receive Revised quote request
Supplier: send Revised supplier quote
Procurement: receive Revised supplier quote
[Revised supplier quote]
Procurement: user Review supplier quote
[Estimated budget]
Procurement: rule Check quoted amount against budget
Is quoted amount within budget?
Yes
[Supplier security questionnaire]
Procurement: user Start compliance and budget reviews
//Contract cannot be signed until both reviews are complete
IT Security: user Review supplier security questionnaire|Finance: user Check budget availability
Are parallel reviews successful?
Both reviews successful
Procurement: user Prepare purchase recommendation
[Purchase recommendation]
Manager: user Give final approval
Procurement: send Purchase order
Supplier: receive Purchase order
Supplier: send Order confirmation
Procurement: receive Order confirmation
[Signed documents]
Procurement: service Record signed documents in contract repository
[db Contract repository]
Procurement: send Purchase approved and ordered notice
Requester: receive Purchase approved and ordered notice
(finish Software purchase approved and ordered)