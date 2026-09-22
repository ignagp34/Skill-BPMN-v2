Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
Yes
Finance Specialist: Return request to employee
Employee: (receive Returned Request)

Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
Yes
Finance Specialist: Approve request automatically
Finance Specialist: Schedule payment
Employee: (receive Payment Notification)

Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: Send request to finance manager
Finance Manager: user Review request
Does manager approve?
Yes
Finance Manager: Approve request
Finance Specialist: Schedule payment
Employee: (receive Payment Notification)

Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: Send request to finance manager
Finance Manager: user Review request
Does manager approve?
No
Finance Manager: Reject request
Finance Manager: Send rejection message
Employee: (receive Rejection Message)