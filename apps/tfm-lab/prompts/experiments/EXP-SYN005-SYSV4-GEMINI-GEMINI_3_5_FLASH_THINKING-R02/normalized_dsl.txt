(start Travel reimbursement request submitted)
Employee: Submit travel reimbursement request
[Reimbursement Request]
Finance Specialist: Check receipts
Finance Specialist: Verify policy rules
Are receipts missing?
Yes
Finance Specialist: Return request to employee
(finish Review ended due to missing receipts)

(start Travel reimbursement request submitted)
Employee: Submit travel reimbursement request
[Reimbursement Request]
Finance Specialist: Check receipts
Finance Specialist: Verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
Yes
Finance Specialist: Approve request
Finance Specialist: Schedule payment
Employee: Receive payment confirmation
(finish Employee informed of approval)

(start Travel reimbursement request submitted)
Employee: Submit travel reimbursement request
[Reimbursement Request]
Finance Specialist: Check receipts
Finance Specialist: Verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: Send request to finance manager
Finance Manager: Review request
Is request approved by manager?
Yes
Finance Specialist: Schedule payment
Employee: Receive payment confirmation
(finish Employee informed of approval)

(start Travel reimbursement request submitted)
Employee: Submit travel reimbursement request
[Reimbursement Request]
Finance Specialist: Check receipts
Finance Specialist: Verify policy rules
Are receipts missing?
No
Is amount within automatic approval limit?
No
Finance Specialist: Send request to finance manager
Finance Manager: Review request
Is request approved by manager?
No
Finance Manager: Send rejection message
Employee: Receive rejection message
(finish Employee informed of rejection)