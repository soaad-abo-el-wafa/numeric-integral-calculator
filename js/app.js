if (!Array.prototype.forEach) //polyfill for forEach
    Array.prototype.forEach = function(callback/*, thisArg*/) {
        let T, k;
        if (this == null) {
            throw new TypeError('this is null or not defined');
        }
        let O = Object(this);
        let len = O.length >>> 0;
        if (typeof callback !== 'function') {
            throw new TypeError(callback + ' is not a function');
        }
        if (arguments.length > 1) {
            T = arguments[1];
        }
        k = 0;
        while (k < len) {
            let kValue;
            if (k in O) {
                callback.call(T, kValue, k, O);
            }
            k++;
        }
    };
String.prototype.prepare=function(){ //better regex with (x\d+)|(y\d+) and easy dataset implementation should be done
    let str=String(this); //force new object
    for(let i=0;i<arguments.length;i++)
        str = str.replace(/\?/,arguments[i]);
    return str;
};

let app=(function(){
    let Plot=new function(){
        const self=this;
        this.id='plot';
        this.options={
            target: '#'+this.id,
            width: 1000,
            height: 400,
            domainX:{
                a:-0,
                b:2
            },
            domainY:{
                min:-1,
                max:4
            },
            xAxis: {
                label: 'x - axis',
                domain:[0, 0]
            },
            yAxis: {
                label: 'y - axis',
                domain:[0, 0]
            },
            data: [{
                fn: 'x^2'
            }]
        };
        this.integration={
            identifiers: {
                TRAPEZNA:'trapezna',
                SIMPSONOVA: 'simpsonova',
                ROMBERGOVA: 'rombergova',
            },
            from: self.options.domainX.a,
            to: self.options.domainX.b,
            points:4
        };

        let calcLabel=function(){
            let dist=(Math.abs(self.range[0])+Math.abs(self.range[1]))/self.points;

            let curr=self.range[0];
            let arr=[];
            for(let i=0;i<=self.points;i++){
                arr.push(curr.toFixed(2));
                curr+=dist;
            }
            return arr;
        };
        let removeIntegrationElements=function(){
           let fn = self.options.data[0];
           self.options.data=[];
           self.options.data.push(fn);
            document.querySelectorAll('.graph').forEach((el)=>{
                el.remove();
            });
        };
        let setDomain=function(){
            self.options.xAxis.domain[0]=self.options.domainX.a;
            self.options.xAxis.domain[1]=self.options.domainX.b;

            self.options.yAxis.domain[0]=self.options.domainY.min;
            self.options.yAxis.domain[1]=self.options.domainY.max;
        };

        this.changeFunction=function(val){
            self.options.data=[{
                fn:val
            }];
            removeIntegrationElements();
            self.update();
        };
        this.init=function(){
            document.getElementById("plot").innerHTML="";
            removeIntegrationElements();
            setDomain();
            functionPlot(self.options);
        };
        this.update=function(){
            setDomain();
            functionPlot(self.options);
        };

        this.integrate=function(type){
            const TYPES=self.integration.identifiers;
            const FORMAT_PRECISION=5;
            removeIntegrationElements();

            let table=document.getElementById('integration-data');
            table.innerHTML=`
                <thead class="thead-dark">
                <tr>
                    <th scope="col">#</th>
                    <th scope="col">Range</th>
                    <th scope="col">Value</th>
                    <th scope="col">Lagrange</th>
                    <th scope="col">Error</th>
                </tr>
                </thead>
            `;

            let findDerivative=function(fn,n){
                for(let i=0;i<(n || 1);i++)
                    fn = math.derivative(fn.toString(),'x');
                return fn;
            };

            const a=self.integration.from;
            const b=self.integration.to;
            const points=self.integration.points;
            const h=math.eval(`(${b}-${a})/${points}`);

            const fn = self.options.data[0].fn;
            const derivative_order= (type===TYPES.TRAPEZNA) ? 2 : 4;
            const derivative = findDerivative(fn,derivative_order);

            let integralVal=0;
            let counter=1;

            let generateXs=function(from,to,points){
                let step = math.eval(`(${from}-${to})/points`);
                let arr=[];
                while(arr.length!==points){
                    arr.push(from);
                    from=math.add(from.step);
                }
                return arr;
            };
            let getLagrange = function(data){ // data = [ { x:5,y:24}, ... ]
                const n=data.length-1;
                let Ln;
                for(let i=0;i<=n;i++){
                    let atom='(?-?)';

                    let li;
                    for(let j=0;j<=n;j++){
                        if(j===i)continue; //preskacemo i
                        li = (li===undefined ? String("(") : li.concat('*'));
                        li += `(x-${data[j].x})`;
                    }
                    li += ')/(';
                    for(let j=0;j<=n;j++){
                        if(j===i)continue; //preskacemo i
                        li += (li.slice(-1)==='(' ? " " : '*');
                        li += `(${data[i].x}-${data[j].x})`;
                    }
                    li += `)*${data[i].y}`;

                    Ln = (Ln===undefined ? li : Ln.concat(`+${li}`));
                }
                return Ln;
            };
            let getDataSet = function(fn){
                let data=[];
                for(let i=1;i<arguments.length;i++){
                    let obj={};
                    obj.x = arguments[i];
                    obj.y = math.eval(fn,{x:arguments[i]});
                    data.push(obj);
                }
                return data;
            };
            let calcErrorBound = function(range){
                let fksi;
                let step = math.eval(`${h}/10`); //moja gruba aproksimacija
                for(let j=range[0];j<range[1];j=math.add(j,step)){
                    let val = math.eval(derivative.toString(),{x: j});
                    fksi=fksi || val;
                    if(val>fksi)
                        fksi=val;
                }
                return fksi;
            }; // range: [ from, to]
            let formatError = function(error){
                let formatted=math.format(error,{notation: 'exponential', precision: FORMAT_PRECISION});
                return formatted;
            };
            let printStep = function(counter,range,val,lagrange,error){
                table.innerHTML+=`
                    <tr>
                        <th scope="row">${counter}</th>
                        <td>$$[${math.parse(math.format(range[0],FORMAT_PRECISION))}, ${math.format(range[1],FORMAT_PRECISION)}]$$</td>
                        <td>$$${math.format(val,{notation: 'fixed', precision: FORMAT_PRECISION})}$$</td>
                        <td>$$${math.parse(lagrange).toTex({parenthesis: 'auto'})}$$</td>
                        <td>$$${math.parse(error).toTex()}$$</td>
                    </tr>
                `;
            };
            let drawHelpers=function(f,range){
                self.options.data.push({
                    fn:f,
                    range: range,
                    closed: true
                });
            };

            switch(type){
                case TYPES.TRAPEZNA:
                    for (let i=a;counter<=points;++counter,i=math.add(i,h)) {
                        let x1 = i;
                        let x2 = math.add(i, h);
                        let range = [x1, x2];

                        let data = getDataSet(fn, x1, x2);
                        let f = getLagrange(data);

                        let val = math.eval(`((${data[1].x}-${data[0].x})/2)*(${data[1].y}+${data[0].y})`);
                        integralVal = math.add(integralVal, val);

                        let fksi = calcErrorBound(range);
                        let error = formatError(math.eval(`(-1/12)*${fksi}*(${data[1].x}-${data[0].x})^3`));

                        printStep(counter, range, val, f,error);
                        drawHelpers(f, range);
                    }
                    break;
                case TYPES.SIMPSONOVA:
                    for (let i=a;counter<=points;++counter,i=math.add(i,h)){
                        let x1=i;
                        let x2=math.eval(`${i}+${h}/2`);
                        let x3=math.add(i,h);

                        let range=[x1,x3];

                        let data = getDataSet(fn,x1,x2,x3);
                        let f = getLagrange(data);

                        let expr="(?/6)*(? + 4*? + ?)".prepare(h,data[0].y,data[1].y,data[2].y);
                        let val=math.eval(expr);
                        integralVal=math.add(integralVal,val);

                        let fksi = calcErrorBound(range);
                        let error = formatError(math.eval(`(1/90)*${fksi}*((${h}/2)^5)`));

                        printStep(counter,range,val,f,error);
                        drawHelpers(f,range);
                    }
                    break;
                default:
                    console.log("Not yet implemented!");
                    break;
            }
            MathJax.Hub.Queue(["Typeset",MathJax.Hub]);
            self.update();
            //dodaj glavni rezultat u tabelu
            table.innerHTML+=`
                <tr>
                    <th scope="row"></th>
                    <th>[${a} ${b}]</th>
                    <th>${math.format(integralVal,{notation: 'fixed', precision: 5})}</th>
                </tr>
            `;
        }
    };

    window.addEventListener("load",function(){
        Plot.init();
        let control = new dat.GUI();

        let graph=control.addFolder("Plot");

        let domainX=graph.addFolder('domainX');
        domainX.add(Plot.options.domainX,'a');
        domainX.add(Plot.options.domainX,'b');

        let domainY=graph.addFolder('domainY');
        domainY.add(Plot.options.domainY,'min');
        domainY.add(Plot.options.domainY,'max');


        graph.add(Plot.options,'width');
        graph.add(Plot.options,'height');
        graph.add(Plot,'init');

        let integration=control.addFolder("Integration");
        integration.add(Plot.integration,'from');
        integration.add(Plot.integration,'to');
        integration.add(Plot.integration,'points');

    });

    return Plot;
})();