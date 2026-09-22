Employee: (start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
Yes
Finance Specialist: user Return request to employee
(finish Review ended)

Employee: (start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
Yes
Finance Specialist: user Approve request automatically
Finance Specialist: service Schedule payment
Employee: user Receive payment notification
(finish Request approved)

Employee: (start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: user Send request to finance manager
Does the finance manager approve?
Yes
Finance Manager: user Approve request
Finance Specialist: service Schedule payment
Employee: user Receive payment notification
(finish Request approved)

Employee: (start Travel reimbursement requested)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: user Send request to finance manager
Does the finance manager approve?
No
Finance Manager: user Reject request
Finance Specialist: user Send rejection message
Employee: user Receive rejection message
(finish Request rejected)

== pools ==
Finance Department -> Employee; Finance Specialist; Finance Manager
