"use client";
import { useCallback } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useSupabaseQuery } from "@/hooks/use-supabase-query";
import { EmptyState } from "@/components/shared/empty-state";
const EMPTY:any[]=[];
export default function Cart(){const query=useCallback(async(c:any)=>{const {data:u}=await c.auth.getUser();if(!u.user)return {data:[],error:null};return c.from("shopping_cart_items").select("id,quantity,unit_price,product_variants(sku,colors(name),sizes(name),products(name,product_images(public_url,is_primary)))").eq("shopping_carts.customer_id",u.user.id);},[]);const {data}=useSupabaseQuery<any[]>(query,EMPTY);return <main className="shop-section"><div className="section-head"><div><p className="eyebrow">YOUR BAG</p><h2>购物车</h2></div><Link href="/shop"><ArrowLeft size={14}/> 继续购物</Link></div>{data.length?<section className="panel"><div className="table-wrap"><table className="data-table"><thead><tr><th>商品</th><th>颜色</th><th>尺码</th><th>数量</th><th>单价</th><th>小计</th></tr></thead><tbody>{data.map(x=><tr key={x.id}><td><strong>{x.product_variants?.products?.name}</strong></td><td>{x.product_variants?.colors?.name}</td><td>{x.product_variants?.sizes?.name}</td><td>{x.quantity}</td><td>€ {Number(x.unit_price).toFixed(2)}</td><td>€ {(Number(x.unit_price)*x.quantity).toFixed(2)}</td></tr>)}</tbody></table></div></section>:<EmptyState title="购物车还是空的" description="登录后选择商品颜色与尺码，商品会保存在你的购物车中。"/>}</main>}
