(receive Charge dispute letter)
[Dispute letter]
[db Billing system]
Billing specialist: Open patient account
[Invoice]
[Treatment record]
[Insurance response]
Billing specialist: Review billing evidence
Is the disputed charge correct?
Yes
Billing specialist: Prepare explanation letter
[Explanation letter]
send Explanation letter to patient
Billing specialist: Close dispute
(finish Patient informed)

(receive Charge dispute letter)
[Dispute letter]
[db Billing system]
Billing specialist: Open patient account
[Invoice]
[Treatment record]
[Insurance response]
Billing specialist: Review billing evidence
Is the disputed charge correct?
No
//Adjustments require documented justification
Billing specialist: Prepare adjustment form
[Adjustment form]
[db Billing system]
Billing specialist: Update billing system
Billing specialist: Issue corrected invoice
[Corrected invoice]
send Corrected invoice to patient
(finish Patient informed)