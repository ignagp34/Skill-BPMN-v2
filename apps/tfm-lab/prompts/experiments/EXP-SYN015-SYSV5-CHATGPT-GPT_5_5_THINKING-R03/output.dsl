(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Rejected
Requester: user Receive manager rejection
(finish Request rejected by manager)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Above budget
Procurement: user Ask requester about reducing scope
Requester: user Decide whether to reduce scope
Should the scope be reduced?
Decline
Procurement: user Close sourcing opportunity
(send Opportunity closed)
(finish Opportunity closed)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Within budget
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
Critical risk
Procurement: user Reject request for security reasons
Requester: user Receive security rejection
Procurement: (send Security rejection notice)
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Within budget
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
(deadline 5 business days)
Procurement: user Mark request expired
Requester: user Receive expiration notice
(finish Request expired)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Within budget
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
No critical risk
//The contract cannot be signed until both reviews are complete
Procurement: user Prepare purchase recommendation
Manager: user Give final approval
Procurement: (send Purchase order)
(receive Order confirmation)
[Signed documents]
Procurement: user Record signed documents
[db Contract repository]
Requester: user Receive purchase approval and order notice
(finish Software approved and ordered)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Above budget
Procurement: user Ask requester about reducing scope
Requester: user Decide whether to reduce scope
Should the scope be reduced?
Agree
Procurement: user Request revised quote
(send Revised quote request)
(receive Revised supplier quote)
Procurement: user Review revised quote
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
Critical risk
Procurement: user Reject request for security reasons
Requester: user Receive security rejection
Procurement: (send Security rejection notice)
(finish Request rejected for security reasons)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Above budget
Procurement: user Ask requester about reducing scope
Requester: user Decide whether to reduce scope
Should the scope be reduced?
Agree
Procurement: user Request revised quote
(send Revised quote request)
(receive Revised supplier quote)
Procurement: user Review revised quote
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
(deadline 5 business days)
Procurement: user Mark request expired
Requester: user Receive expiration notice
(finish Request expired)

(start Software request submitted)
[Business justification]
[Estimated budget]
Requester: user Submit software request
Manager: user Review software request
Does the manager approve the request?
Approved
Procurement: user Start sourcing process
(send Request for quotation)
(receive Supplier quote)
Procurement: user Review supplier quote
Is the quoted amount within budget?
Above budget
Procurement: user Ask requester about reducing scope
Requester: user Decide whether to reduce scope
Should the scope be reduced?
Agree
Procurement: user Request revised quote
(send Revised quote request)
(receive Revised supplier quote)
Procurement: user Review revised quote
[Supplier security questionnaire]
[Budget records]
IT Security: user Review supplier security questionnaire|Finance: user Confirm budget availability
Does IT security find a critical risk?
No critical risk
//The contract cannot be signed until both reviews are complete
Procurement: user Prepare purchase recommendation
Manager: user Give final approval
Procurement: (send Purchase order)
(receive Order confirmation)
[Signed documents]
Procurement: user Record signed documents
[db Contract repository]
Requester: user Receive purchase approval and order notice
(finish Software approved and ordered)

Supplier: (receive Request for quotation)
Supplier: user Prepare supplier quote
(send Supplier quote)
(finish Initial quote submitted)

Supplier: (receive Revised quote request)
Supplier: user Prepare revised supplier quote
(send Revised supplier quote)
(finish Revised quote submitted)

Supplier: (receive Opportunity closed)
(finish Opportunity closure received)

Supplier: (receive Security rejection notice)
(finish Security rejection received)

Supplier: (receive Purchase order)
Supplier: user Process purchase order
(send Order confirmation)
(finish Order confirmed)

== pools ==
Procuring Company -> Requester; Manager; Procurement; IT Security; Finance
Software Supplier -> Supplier
