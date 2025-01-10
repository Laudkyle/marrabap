import React from "react";
import { FaStar } from "react-icons/fa";
function ExpenseList() {
  return (
    <div className="w-[50vw]">
      <div className="border w-full h-40 m-2 rounded-lg flex">
            <div className="min-w-40 h-full">
            <img className="w-full h-full" src={"/images/logo.png"} alt="" />
            </div>
            <div className="flex-col mx-2 w-32 space-y-1 ">

            <div>Product 1</div>
            <div>Category Dress</div>
            <div>$ 45.00</div>
            <div className="flex gap-x-1">
                <FaStar color="yellow" />
                <FaStar color="yellow" />
                <FaStar color="yellow" />
                <FaStar />
                <FaStar />
            </div>
            <div className="text-sm">Lorem ipsum, dolor sit amet consectetur adipisicing elit. Ullam, explicabo. Repellat repudiandae accusamus error obcaecati perspiciatis</div>
        </div>
      </div>
    </div>
  );
}

export default ExpenseList;
