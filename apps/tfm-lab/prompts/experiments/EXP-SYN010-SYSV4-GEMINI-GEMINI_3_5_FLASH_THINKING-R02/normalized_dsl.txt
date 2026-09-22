Buyer:
(start Purchase Process Initiated)
send Purchase Order
(receive Order Confirmation)
(finish Order Confirmed)

Buyer:
(start Purchase Process Initiated)
send Purchase Order
(receive Revised Offer)
user Review Revised Offer
Is the revised offer accepted?
Yes
send Acceptance
(receive Final Confirmation)
(finish Order Confirmed)

Buyer:
(start Purchase Process Initiated)
send Purchase Order
(receive Revised Offer)
user Review Revised Offer
Is the revised offer accepted?
No
send Rejection
(finish Order Rejected)

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all requested items available?
Yes
send Order Confirmation
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all requested items available?
No
send Revised Offer
(receive Acceptance)
send Final Confirmation
(finish Order Confirmed)

Supplier:
(receive Purchase Order)
service Check Stock Availability
Are all requested items available?
No
send Revised Offer
(receive Rejection)
service Close Order Request
(finish Order Closed)