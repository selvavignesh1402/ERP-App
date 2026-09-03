import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import Svg, { Path, Rect, G } from 'react-native-svg';

export interface ReceiptOptions {
    showLogo: boolean;
    showGst: boolean;
    showCustomer: boolean;
    showPayment: boolean;
    showQr: boolean;
    showThanks: boolean;
}

export interface ShopDetails {
    name: string;
    subtitle: string;
    address: string;
    phone: string;
    gstin: string;
    upiId: string;
}

export interface ThermalReceiptProps {
    bill: any;
    items: any[];
    paperSize?: '58mm' | '80mm';
    fontSize?: 'compact' | 'normal' | 'large';
    options?: Partial<ReceiptOptions>;
    isDuplicate?: boolean;
    shopDetails?: Partial<ShopDetails>;
}

const DEFAULT_SHOP: ShopDetails = {
    name: 'SRI LAKSHMI RICE TRADERS',
    subtitle: 'Wholesale & Retail Rice Merchant',
    address: 'No. 12, Market Main Road, Salem - 636001',
    phone: '+91 98765 43210',
    gstin: '33AAAAA0000A1Z5',
    upiId: 'srilakshmirice@upi',
};

const DEFAULT_OPTIONS: ReceiptOptions = {
    showLogo: true,
    showGst: true,
    showCustomer: true,
    showPayment: true,
    showQr: true,
    showThanks: true,
};

// Simplified SVG Vector QR Code representation for thermal print
const ThermalQRCode = ({ size = 96 }: { size?: number }) => {
    return (
        <Svg width={size} height={size} viewBox="0 0 25 25" style={{ alignSelf: 'center', marginVertical: 6 }}>
            <Rect x="0" y="0" width="25" height="25" fill="#FFFFFF" />
            {/* Top-Left Finder */}
            <Rect x="2" y="2" width="7" height="7" fill="#000000" />
            <Rect x="3" y="3" width="5" height="5" fill="#FFFFFF" />
            <Rect x="4" y="4" width="3" height="3" fill="#000000" />
            {/* Top-Right Finder */}
            <Rect x="16" y="2" width="7" height="7" fill="#000000" />
            <Rect x="17" y="3" width="5" height="5" fill="#FFFFFF" />
            <Rect x="18" y="4" width="3" height="3" fill="#000000" />
            {/* Bottom-Left Finder */}
            <Rect x="2" y="16" width="7" height="7" fill="#000000" />
            <Rect x="3" y="17" width="5" height="5" fill="#FFFFFF" />
            <Rect x="4" y="18" width="3" height="3" fill="#000000" />
            {/* Data Modules */}
            <G fill="#000000">
                <Rect x="10" y="2" width="1" height="2" />
                <Rect x="12" y="2" width="2" height="1" />
                <Rect x="10" y="5" width="2" height="2" />
                <Rect x="13" y="4" width="1" height="3" />
                <Rect x="2" y="10" width="2" height="1" />
                <Rect x="5" y="10" width="3" height="1" />
                <Rect x="10" y="9" width="1" height="4" />
                <Rect x="12" y="10" width="3" height="2" />
                <Rect x="16" y="10" width="2" height="1" />
                <Rect x="20" y="10" width="3" height="2" />
                <Rect x="10" y="14" width="2" height="2" />
                <Rect x="14" y="13" width="1" height="3" />
                <Rect x="17" y="13" width="2" height="2" />
                <Rect x="21" y="14" width="2" height="1" />
                <Rect x="10" y="17" width="3" height="1" />
                <Rect x="14" y="17" width="2" height="3" />
                <Rect x="18" y="17" width="1" height="2" />
                <Rect x="20" y="18" width="3" height="1" />
                <Rect x="10" y="20" width="2" height="3" />
                <Rect x="13" y="21" width="3" height="2" />
                <Rect x="18" y="20" width="2" height="3" />
                <Rect x="21" y="21" width="2" height="2" />
            </G>
        </Svg>
    );
};

// Serrated Paper Edge (Top and Bottom)
const PaperTearEdge = ({ width }: { width: number }) => {
    // Generate teeth path
    const toothCount = Math.floor(width / 10);
    let d = 'M 0 6 ';
    for (let i = 0; i < toothCount; i++) {
        const x1 = i * 10 + 5;
        const x2 = (i + 1) * 10;
        d += `L ${x1} 0 L ${x2} 6 `;
    }
    d += `L ${width} 6 L ${width} 6 Z`;

    return (
        <Svg width={width} height={6} style={{ width: '100%' }}>
            <Path d={d} fill="#ECEAE4" />
        </Svg>
    );
};

export const ThermalReceipt: React.FC<ThermalReceiptProps> = ({
    bill,
    items = [],
    paperSize = '58mm',
    fontSize = 'normal',
    options = DEFAULT_OPTIONS,
    isDuplicate = false,
    shopDetails = DEFAULT_SHOP,
}) => {
    if (!bill) return null;

    const opt: ReceiptOptions = { ...DEFAULT_OPTIONS, ...options };
    const shop: ShopDetails = { ...DEFAULT_SHOP, ...shopDetails };
    const is58mm = paperSize === '58mm';

    // Scale font sizes
    const fontMultiplier = fontSize === 'compact' ? 0.88 : fontSize === 'large' ? 1.15 : 1.0;
    const fs = (size: number) => Math.round(size * fontMultiplier);

    const dateObj = bill.saleDate ? new Date(bill.saleDate) : new Date();
    const formattedDate = dateObj.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
    });
    const formattedTime = dateObj.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    });

    const subtotal = parseFloat(bill.total) || parseFloat(bill.grandTotal) || 0;
    const discountVal = parseFloat(bill.discount) || 0;
    const cgstVal = parseFloat(bill.cgst) || 0;
    const sgstVal = parseFloat(bill.sgst) || 0;
    const grandTotal = parseFloat(bill.grandTotal) || 0;
    const paidAmount = bill.paidAmount !== undefined ? parseFloat(bill.paidAmount) : (bill.paymentMode === 'CREDIT' ? 0 : grandTotal);
    const balanceDue = bill.balanceDue !== undefined ? parseFloat(bill.balanceDue) : (bill.paymentMode === 'CREDIT' ? grandTotal : Math.max(0, grandTotal - paidAmount));

    const monoFont = Platform.select({
        ios: 'Courier New',
        android: 'monospace',
        default: 'monospace',
    });

    const dividerChar = is58mm ? '--------------------------------' : '------------------------------------------------';

    return (
        <View style={[styles.outerContainer, is58mm ? styles.width58mm : styles.width80mm]}>
            {/* Top Serrated Paper Cut Edge */}
            <PaperTearEdge width={is58mm ? 290 : 360} />

            {/* Main White Thermal Paper Sheet */}
            <View style={styles.paperSheet}>
                {/* 1. DUPLICATE WATERMARK STAMP */}
                {isDuplicate && (
                    <View style={styles.duplicateStampBox}>
                        <Text style={[styles.duplicateStampText, { fontFamily: monoFont }]}>
                            *** DUPLICATE REPRINT ***
                        </Text>
                    </View>
                )}

                {/* 2. SHOP HEADER */}
                {opt.showLogo && (
                    <View style={styles.headerSection}>
                        <Text style={[styles.shopTitle, { fontFamily: monoFont, fontSize: fs(is58mm ? 14 : 16) }]}>
                            {shop.name}
                        </Text>
                        <Text style={[styles.shopSubtitle, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                            {shop.subtitle}
                        </Text>
                        <Text style={[styles.shopMeta, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                            {shop.address}
                        </Text>
                        <Text style={[styles.shopMeta, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                            Phone: {shop.phone}
                        </Text>
                        {opt.showGst && shop.gstin ? (
                            <Text style={[styles.shopGst, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                GSTIN: {shop.gstin}
                            </Text>
                        ) : null}
                    </View>
                )}

                <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                {/* 3. INVOICE TITLE */}
                <View style={styles.invoiceTitleRow}>
                    <Text style={[styles.invoiceTitleText, { fontFamily: monoFont, fontSize: fs(is58mm ? 13 : 14) }]}>
                        TAX INVOICE
                    </Text>
                </View>

                <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                {/* 4. INVOICE & CUSTOMER META */}
                <View style={styles.metaSection}>
                    <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                            Invoice No :
                        </Text>
                        <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5) }]}>
                            {bill.billNumber || `INV-${bill.id || '1001'}`}
                        </Text>
                    </View>

                    <View style={styles.metaRow}>
                        <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                            Date & Time:
                        </Text>
                        <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                            {formattedDate} {formattedTime}
                        </Text>
                    </View>

                    {opt.showCustomer && (
                        <>
                            <View style={styles.metaRow}>
                                <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                    Customer   :
                                </Text>
                                <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5), fontWeight: '700' }]} numberOfLines={1}>
                                    {bill.customerName || bill.customer?.customerName || 'Walk-in Cash Guest'}
                                </Text>
                            </View>

                            {bill.customer?.phone ? (
                                <View style={styles.metaRow}>
                                    <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                        Mobile     :
                                    </Text>
                                    <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                        {bill.customer.phone}
                                    </Text>
                                </View>
                            ) : null}

                            {bill.customer?.address ? (
                                <View style={styles.metaRow}>
                                    <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                        Address    :
                                    </Text>
                                    <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]} numberOfLines={1}>
                                        {bill.customer.address}
                                    </Text>
                                </View>
                            ) : null}
                        </>
                    )}
                </View>

                <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                {/* 5. ITEM TABLE */}
                {is58mm ? (
                    // 58mm COMPACT 3-COL TABLE
                    <View style={styles.table58Container}>
                        <View style={styles.table58HeaderRow}>
                            <Text style={[styles.col58Item, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(10) }]}>
                                ITEM
                            </Text>
                            <Text style={[styles.col58Qty, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(10), textAlign: 'center' }]}>
                                QTY
                            </Text>
                            <Text style={[styles.col58Amt, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(10), textAlign: 'right' }]}>
                                AMOUNT
                            </Text>
                        </View>
                        <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                        {items.length === 0 ? (
                            <Text style={[styles.emptyItemText, { fontFamily: monoFont }]}>No line items recorded</Text>
                        ) : (
                            items.map((it, idx) => {
                                const pName = it.product?.productName || it.productName || 'Rice Product';
                                const brand = it.product?.brand || it.brand || '';
                                const bagKg = it.product?.bagSizeKg || it.bagSizeKg || 25;
                                const qty = parseFloat(it.quantity) || 1;
                                const rate = parseFloat(it.price) || 0;
                                const amount = qty * rate;

                                return (
                                    <View key={it.id || idx} style={styles.itemRow58}>
                                        <View style={styles.col58Item}>
                                            <Text style={[styles.itemTextBold, { fontFamily: monoFont, fontSize: fs(10.5) }]} numberOfLines={1}>
                                                {brand ? `${brand} ` : ''}{pName}
                                            </Text>
                                            <Text style={[styles.itemTextSub, { fontFamily: monoFont, fontSize: fs(9) }]}>
                                                {bagKg}kg × ₹{rate}
                                            </Text>
                                        </View>
                                        <Text style={[styles.col58Qty, { fontFamily: monoFont, fontSize: fs(10.5), textAlign: 'center' }]}>
                                            {qty} B
                                        </Text>
                                        <Text style={[styles.col58Amt, { fontFamily: monoFont, fontSize: fs(10.5), textAlign: 'right' }]}>
                                            {amount.toFixed(0)}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                ) : (
                    // 80mm DETAILED 4-COL TABLE
                    <View style={styles.table80Container}>
                        <View style={styles.table80HeaderRow}>
                            <Text style={[styles.col80Item, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(11) }]}>
                                ITEM / PACKAGING
                            </Text>
                            <Text style={[styles.col80Qty, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(11), textAlign: 'center' }]}>
                                QTY / WT
                            </Text>
                            <Text style={[styles.col80Rate, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(11), textAlign: 'right' }]}>
                                RATE
                            </Text>
                            <Text style={[styles.col80Amt, styles.tableHeaderTitle, { fontFamily: monoFont, fontSize: fs(11), textAlign: 'right' }]}>
                                AMOUNT
                            </Text>
                        </View>
                        <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                        {items.length === 0 ? (
                            <Text style={[styles.emptyItemText, { fontFamily: monoFont }]}>No line items recorded</Text>
                        ) : (
                            items.map((it, idx) => {
                                const pName = it.product?.productName || it.productName || 'Rice Product';
                                const brand = it.product?.brand || it.brand || '';
                                const bagKg = it.product?.bagSizeKg || it.bagSizeKg || 25;
                                const qty = parseFloat(it.quantity) || 1;
                                const totalKg = qty * bagKg;
                                const rate = parseFloat(it.price) || 0;
                                const amount = qty * rate;

                                return (
                                    <View key={it.id || idx} style={styles.itemRow80}>
                                        <View style={styles.col80Item}>
                                            <Text style={[styles.itemTextBold, { fontFamily: monoFont, fontSize: fs(11.5) }]} numberOfLines={1}>
                                                {brand ? `${brand} ` : ''}{pName}
                                            </Text>
                                            <Text style={[styles.itemTextSub, { fontFamily: monoFont, fontSize: fs(9.5) }]}>
                                                Pack: {bagKg} Kg Bag
                                            </Text>
                                        </View>
                                        <View style={styles.col80Qty}>
                                            <Text style={[styles.itemTextBold, { fontFamily: monoFont, fontSize: fs(11), textAlign: 'center' }]}>
                                                {qty} Bags
                                            </Text>
                                            <Text style={[styles.itemTextSub, { fontFamily: monoFont, fontSize: fs(9), textAlign: 'center' }]}>
                                                ({totalKg} Kg)
                                            </Text>
                                        </View>
                                        <Text style={[styles.col80Rate, { fontFamily: monoFont, fontSize: fs(11), textAlign: 'right' }]}>
                                            ₹{rate.toFixed(0)}
                                        </Text>
                                        <Text style={[styles.col80Amt, { fontFamily: monoFont, fontSize: fs(11.5), textAlign: 'right' }]}>
                                            ₹{amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                        </Text>
                                    </View>
                                );
                            })
                        )}
                    </View>
                )}

                <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                {/* 6. FINANCIAL SUMMARY */}
                <View style={styles.summarySection}>
                    <View style={styles.summaryRow}>
                        <Text style={[styles.summaryLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                            Subtotal
                        </Text>
                        <Text style={[styles.summaryValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5) }]}>
                            ₹{subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    {discountVal > 0 && (
                        <View style={styles.summaryRow}>
                            <Text style={[styles.summaryLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                Discount
                            </Text>
                            <Text style={[styles.summaryValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5) }]}>
                                - ₹{discountVal.toFixed(2)}
                            </Text>
                        </View>
                    )}

                    {opt.showGst && (cgstVal > 0 || sgstVal > 0) && (
                        <>
                            {cgstVal > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                                        CGST (2.5%)
                                    </Text>
                                    <Text style={[styles.summaryValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                                        + ₹{cgstVal.toFixed(2)}
                                    </Text>
                                </View>
                            )}
                            {sgstVal > 0 && (
                                <View style={styles.summaryRow}>
                                    <Text style={[styles.summaryLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                                        SGST (2.5%)
                                    </Text>
                                    <Text style={[styles.summaryValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                                        + ₹{sgstVal.toFixed(2)}
                                    </Text>
                                </View>
                            )}
                        </>
                    )}

                    <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>

                    {/* GRAND TOTAL */}
                    <View style={styles.grandTotalRow}>
                        <Text style={[styles.grandTotalLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 13 : 15) }]}>
                            TOTAL
                        </Text>
                        <Text style={[styles.grandTotalValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 14 : 16) }]}>
                            ₹{grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </Text>
                    </View>

                    <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>
                </View>

                {/* 7. PAYMENT & LEDGER BREAKDOWN */}
                {opt.showPayment && (
                    <View style={styles.paymentSection}>
                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                Payment Mode :
                            </Text>
                            <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5), fontWeight: '700' }]}>
                                {bill.paymentMode || 'CASH'}
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11) }]}>
                                Paid Amount  :
                            </Text>
                            <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5) }]}>
                                ₹{paidAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        <View style={styles.metaRow}>
                            <Text style={[styles.metaLabel, { fontFamily: monoFont, fontSize: fs(is58mm ? 10 : 11), fontWeight: balanceDue > 0 ? '700' : '400' }]}>
                                Balance Due  :
                            </Text>
                            <Text style={[styles.metaValue, { fontFamily: monoFont, fontSize: fs(is58mm ? 10.5 : 11.5), fontWeight: '700' }]}>
                                ₹{balanceDue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                            </Text>
                        </View>

                        {balanceDue > 0 && (
                            <Text style={[styles.ledgerNote, { fontFamily: monoFont, fontSize: fs(is58mm ? 8.5 : 9.5) }]}>
                                * Balance ₹{balanceDue.toFixed(2)} added to Customer Credit Ledger.
                            </Text>
                        )}
                    </View>
                )}

                {/* 8. DYNAMIC UPI QR CODE */}
                {opt.showQr && shop.upiId && (!is58mm || grandTotal > 0) && (
                    <View style={styles.qrSection}>
                        <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>
                        <Text style={[styles.qrTitle, { fontFamily: monoFont, fontSize: fs(is58mm ? 9.5 : 10.5) }]}>
                            --- SCAN TO PAY VIA UPI ---
                        </Text>
                        <ThermalQRCode size={is58mm ? 80 : 96} />
                        <Text style={[styles.qrUpiId, { fontFamily: monoFont, fontSize: fs(is58mm ? 9 : 10) }]}>
                            UPI: {shop.upiId}
                        </Text>
                    </View>
                )}

                {/* 9. THANK YOU & FOOTER */}
                {opt.showThanks && (
                    <View style={styles.footerSection}>
                        <Text style={[styles.divider, { fontFamily: monoFont }]}>{dividerChar}</Text>
                        <Text style={[styles.footerThanks, { fontFamily: monoFont, fontSize: fs(is58mm ? 11 : 12.5) }]}>
                            Thank You! Visit Again 🙏
                        </Text>
                        <Text style={[styles.footerDisclaimer, { fontFamily: monoFont, fontSize: fs(is58mm ? 8 : 9) }]}>
                            Computer Generated Invoice · Goods once sold cannot be returned
                        </Text>
                    </View>
                )}
            </View>

            {/* Bottom Serrated Paper Cut Edge */}
            <PaperTearEdge width={is58mm ? 290 : 360} />
        </View>
    );
};

const styles = StyleSheet.create({
    outerContainer: {
        alignSelf: 'center',
        marginVertical: 12,
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.18,
        shadowRadius: 10,
        elevation: 6,
    },
    width58mm: {
        width: 290,
    },
    width80mm: {
        width: 360,
    },
    paperSheet: {
        backgroundColor: '#FFFFFF',
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#E2E0D8',
    },
    duplicateStampBox: {
        borderWidth: 1.5,
        borderColor: '#000000',
        borderStyle: 'dashed',
        paddingVertical: 3,
        paddingHorizontal: 8,
        alignSelf: 'center',
        marginBottom: 8,
    },
    duplicateStampText: {
        fontSize: 11,
        fontWeight: '900',
        color: '#000000',
        textAlign: 'center',
        letterSpacing: 1,
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 4,
    },
    shopTitle: {
        fontWeight: '900',
        color: '#000000',
        textAlign: 'center',
        letterSpacing: 0.5,
    },
    shopSubtitle: {
        color: '#222222',
        textAlign: 'center',
        marginTop: 1,
    },
    shopMeta: {
        color: '#444444',
        textAlign: 'center',
        marginTop: 1,
    },
    shopGst: {
        color: '#000000',
        fontWeight: '700',
        textAlign: 'center',
        marginTop: 2,
    },
    divider: {
        color: '#666666',
        fontSize: 10,
        textAlign: 'center',
        marginVertical: 2,
    },
    invoiceTitleRow: {
        alignItems: 'center',
        paddingVertical: 1,
    },
    invoiceTitleText: {
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 1,
    },
    metaSection: {
        marginVertical: 2,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 1,
    },
    metaLabel: {
        color: '#333333',
    },
    metaValue: {
        color: '#000000',
        fontWeight: '600',
        textAlign: 'right',
        flex: 1,
        marginLeft: 8,
    },

    // 58mm Table
    table58Container: {
        marginVertical: 2,
    },
    table58HeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    col58Item: {
        flex: 2.2,
    },
    col58Qty: {
        flex: 0.9,
    },
    col58Amt: {
        flex: 1.2,
    },
    itemRow58: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 2.5,
    },

    // 80mm Table
    table80Container: {
        marginVertical: 2,
    },
    table80HeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    col80Item: {
        flex: 2.2,
    },
    col80Qty: {
        flex: 1.1,
    },
    col80Rate: {
        flex: 1.0,
    },
    col80Amt: {
        flex: 1.2,
    },
    itemRow80: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 3,
    },

    tableHeaderTitle: {
        fontWeight: '900',
        color: '#000000',
    },
    itemTextBold: {
        fontWeight: '700',
        color: '#000000',
    },
    itemTextSub: {
        color: '#555555',
        marginTop: 1,
    },
    emptyItemText: {
        color: '#777777',
        textAlign: 'center',
        fontStyle: 'italic',
        marginVertical: 4,
    },

    // Summary
    summarySection: {
        marginVertical: 2,
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginVertical: 1,
    },
    summaryLabel: {
        color: '#333333',
    },
    summaryValue: {
        color: '#000000',
        fontWeight: '600',
    },
    grandTotalRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 2,
    },
    grandTotalLabel: {
        fontWeight: '900',
        color: '#000000',
        letterSpacing: 0.5,
    },
    grandTotalValue: {
        fontWeight: '900',
        color: '#000000',
    },

    // Payment & Ledger
    paymentSection: {
        marginVertical: 2,
    },
    ledgerNote: {
        color: '#333333',
        marginTop: 3,
        fontStyle: 'italic',
    },

    // QR Code
    qrSection: {
        alignItems: 'center',
        marginVertical: 2,
    },
    qrTitle: {
        color: '#333333',
        fontWeight: '700',
        marginBottom: 2,
    },
    qrUpiId: {
        color: '#000000',
        fontWeight: '700',
        marginTop: 2,
    },

    // Footer
    footerSection: {
        alignItems: 'center',
        marginTop: 2,
    },
    footerThanks: {
        fontWeight: '800',
        color: '#000000',
        textAlign: 'center',
        marginVertical: 2,
    },
    footerDisclaimer: {
        color: '#777777',
        textAlign: 'center',
        marginTop: 2,
    },
});

export default ThermalReceipt;
