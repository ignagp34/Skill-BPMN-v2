Billing Specialist: (receive Charge dispute letter)
[Dispute letter]
[db Billing system]
Billing Specialist: user Open patient account
[Invoice]
[Treatment record]
[Insurance response]
//Adjustments require documented justification
Billing Specialist: user Review charge documentation
Is the charge correct?
Yes
Billing Specialist: send Send explanation letter
[Explanation letter]
Billing Specialist: user Close dispute
(finish Dispute closed with charge confirmed)

Billing Specialist: (receive Charge dispute letter)
[Dispute letter]
[db Billing system]
Billing Specialist: user Open patient account
[Invoice]
[Treatment record]
[Insurance response]
//Adjustments require documented justification
Billing Specialist: user Review charge documentation
Is the charge correct?
No
Billing Specialist: user Prepare adjustment form
[Adjustment form]
[db Billing system]
Billing Specialist: service Update patient account
[db Billing system]
Billing Specialist: user Issue corrected invoice
[Corrected invoice]
Billing Specialist: send Send corrected invoice to patient
(finish Patient informed of corrected charge)
