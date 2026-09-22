[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
No
Manager: Inform requester that software request is rejected
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
No
Procurement: Ask requester whether scope should be reduced
Requester: Decide on scope reduction
Should scope be reduced?
No
Procurement: send Opportunity closed
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
No
Procurement: Ask requester whether scope should be reduced
Requester: Decide on scope reduction
Should scope be reduced?
Yes
Procurement: send Revised request for quotation
(receive Revised supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
No - critical security risk
Procurement: Inform requester that request is rejected for security reasons
send Security rejection notice
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
No
Procurement: Ask requester whether scope should be reduced
Requester: Decide on scope reduction
Should scope be reduced?
Yes
Procurement: send Revised request for quotation
(receive Revised supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
No - budget confirmation timeout
(timer five business days)
Procurement: Expire software request
Notify requester that request has expired
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
No - critical security risk
Procurement: Inform requester that request is rejected for security reasons
send Security rejection notice
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
No - budget confirmation timeout
(timer five business days)
Procurement: Expire software request
Notify requester that request has expired
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
No
Procurement: Ask requester whether scope should be reduced
Requester: Decide on scope reduction
Should scope be reduced?
Yes
Procurement: send Revised request for quotation
(receive Revised supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order
(receive Order confirmation)
[Signed Documents]
[db Contract Repository]
Inform requester that software purchase has been approved and ordered
(finish)

[Business Justification Document]
[Estimated Budget]
Requester: Submit software request
Manager: Review software request
Is manager approval granted?
Yes
Procurement: Start sourcing process
send Request for quotation
(receive Supplier quote)
Review supplier quote
Check quoted amount against budget
Is quote within budget?
Yes
[Supplier Security Questionnaire]
IT Security: Review supplier security questionnaire|Finance: Confirm budget availability
Are reviews completed successfully?
Yes
//Contract cannot be signed until both reviews are complete
Procurement: Prepare purchase recommendation
Manager: Give final approval
Procurement: send Purchase order
(receive Order confirmation)
[Signed Documents]
[db Contract Repository]
Inform requester that software purchase has been approved and ordered
(finish)

Supplier:
(receive Request for quotation)
Prepare supplier quote
send Supplier quote

Supplier:
(receive Revised request for quotation)
Prepare revised supplier quote
send Revised supplier quote

Supplier:
(receive Opportunity closed)
Close sales opportunity

Supplier:
(receive Security rejection notice)
Record security rejection

Supplier:
(receive Purchase order)
Send order confirmation
