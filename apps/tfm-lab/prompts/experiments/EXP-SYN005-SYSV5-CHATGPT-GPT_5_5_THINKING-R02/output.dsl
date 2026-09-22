(start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts
Are receipts complete?
No
Finance Specialist: send Return request to employee
Employee: receive Receive returned request
(finish Employee informed of missing receipts)

(start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts
Are receipts complete?
Yes
Finance Specialist: rule Verify policy rules
Is amount within automatic approval limit?
Yes
Finance Specialist: user Approve request
Finance Specialist: service Schedule payment
Finance Specialist: send Send approval message
Employee: receive Receive approval message
(finish Employee informed of approval)

(start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts
Are receipts complete?
Yes
Finance Specialist: rule Verify policy rules
Is amount within automatic approval limit?
No
Finance Specialist: send Send request to finance manager
Finance Manager: receive Receive request for approval
Finance Manager: user Review request
Does finance manager approve the request?
Yes
Finance Manager: user Approve request
Finance Specialist: service Schedule payment
Finance Specialist: send Send approval message
Employee: receive Receive approval message
(finish Employee informed of approval)

(start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts
Are receipts complete?
Yes
Finance Specialist: rule Verify policy rules
Is amount within automatic approval limit?
No
Finance Specialist: send Send request to finance manager
Finance Manager: receive Receive request for approval
Finance Manager: user Review request
Does finance manager approve the request?
No
Finance Manager: user Reject request
Finance Specialist: send Send rejection message
Employee: receive Receive rejection message
(finish Employee informed of rejection)

== pools ==
Finance Department -> Employee; Finance Specialist; Finance Manager
