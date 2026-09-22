Buyer: (start Purchase requirement identified)
Buyer: user Prepare purchase order
(send Purchase Order)
(receive Order Confirmation)
Buyer: user Accept order
(finish Order confirmed)

Buyer: (start Purchase requirement identified)
Buyer: user Prepare purchase order
(send Purchase Order)
(receive Revised Offer)
Buyer: user Review revised offer
Accept revised offer?
Yes
(send Revised Offer Acceptance)
(receive Final Confirmation)
Buyer: user Accept order
(finish Order confirmed)

Buyer: (start Purchase requirement identified)
Buyer: user Prepare purchase order
(send Purchase Order)
(receive Revised Offer)
Buyer: user Review revised offer
Accept revised offer?
No
(send Revised Offer Rejection)
(finish Order rejected)

Supplier: (receive Purchase Order)
Supplier: user Check stock availability
Are all requested items available?
Yes
(send Order Confirmation)
(finish Order confirmed)

Supplier: (receive Purchase Order)
Supplier: user Check stock availability
Are all requested items available?
No
Supplier: user Prepare revised offer
(send Revised Offer)
(receive Revised Offer Acceptance)
(send Final Confirmation)
(finish Order confirmed)

Supplier: (receive Purchase Order)
Supplier: user Check stock availability
Are all requested items available?
No
Supplier: user Prepare revised offer
(send Revised Offer)
(receive Revised Offer Rejection)
Supplier: user Close order request
(finish Order rejected)

== pools ==
Buying Organization -> Buyer
Supplying Organization -> Supplier
