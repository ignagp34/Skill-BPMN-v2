(start Reimbursement request submitted)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
Yes
Finance Specialist: user Return request to employee
(finish Request returned and review ended)

(start Reimbursement request submitted)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is total amount within automatic approval limit?
Yes
Finance Specialist: user Approve request
Finance Specialist: service Schedule payment
Employee: Receive payment notification
(finish Request approved and payment scheduled)

(start Reimbursement request submitted)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is total amount within automatic approval limit?
No
Finance Specialist: user Send request to finance manager
Finance Manager: user Review request
Does finance manager approve?
Yes
Finance Manager: user Approve request
Finance Specialist: service Schedule payment
Employee: Receive payment notification
(finish Request approved and payment scheduled)

(start Reimbursement request submitted)
Employee: user Submit travel reimbursement request
Finance Specialist: user Check receipts and verify policy rules
Are receipts missing?
No
Is total amount within automatic approval limit?
No
Finance Specialist: user Send request to finance manager
Finance Manager: user Review request
Does finance manager approve?
No
Finance Manager: user Reject request
Finance Manager: Send rejection message to employee
Employee: Receive rejection message
(finish Request rejected and employee informed)