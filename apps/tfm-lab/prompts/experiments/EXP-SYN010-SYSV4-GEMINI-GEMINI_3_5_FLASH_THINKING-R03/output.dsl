Buyer:
(start Purchase Needed)
send Purchase Order
(receive Order Confirmation)
(finish Order Confirmed)

Buyer:
(start Purchase Needed)
send Purchase Order
(receive Revised Offer)
user Review revised offer
Is revised offer accepted?
Yes
send Acceptance
(receive Final Confirmation)
(finish Order Confirmed)

Buyer:
(start Purchase Needed)
send Purchase Order
(receive Revised Offer)
user Review revised offer
Is revised offer accepted?
No
send Rejection
(finish Order Rejected)

Supplier:
(receive Purchase Order)
Check stock availability
Are all requested items available?
Yes
send Order Confirmation
(finish Order Processed)

Supplier:
(receive Purchase Order)
Check stock availability
Are all requested items available?
No
send Revised Offer
(receive Acceptance)
send Final Confirmation
(finish Order Processed)

Supplier:
(receive Purchase Order)
Check stock availability
Are all requested items available?
No
send Revised Offer
(receive Rejection)
Close order request
(finish Order Request Closed)