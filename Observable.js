define(function(){

    function filEvent( e )  { return function(l){ return l.__event !== e; } }
    function filFunct( f )  { return function(l){ return f !== l; } }
    function diff(a,b)      { return a.filter(function(n){return b.indexOf(n) === -1; }); }
    function debounce( t,f ){ var x; return function(){ clearTimeout(x); x = setTimeout(f,t); }}


    function Observable( val, o ){

        val = val || null;
        o = o || {};
        
        if ( val && val.call ) return new Computed( val, o );
        if ( val && val.push ) return new ObservableArray( val, o );

        var listeners = [];

        function obs( v )      { return arguments.length ? set( v ) : get(); }

        function get()         { var d; if (Computed && (d = Computed.__detected) ) d.push(obs); emit('get'); return val; }
        function set( v )      { var o = val; val = v; emit('change', {oldValue : o, newValue : v}); return obs; }
        function emit( e, d )  { listeners.filter(function(l){ return l.__event===e;}).forEach(function(l){ l.call( null, d );}); return obs; }
        function on( e, l )    { l.__event = e; listeners.push( l ); emit('addListener', l ); return obs; }
        function off( e )      { listeners = listeners.filter(e.match ? filEvent(e) : filFunct(e)); emit('removeListener', e ); return obs; }

        obs.get  = get;
        obs.set  = set;
        obs.emit = obs.trigger = emit;
        obs.on   = obs.addEventListener = on;
        obs.off  = obs.removeEventListener = off;

        obs.listeners = function(){ return listeners; }

        return obs;
    }

    function ObservableArray( arr, o ){

        arr = arr || [];
        o = o || {};
        
        var listeners = [];


        function obs( v )      { return arguments.length ? set( v ) : get(); }

        function get()         { var d; if (Computed && (d = Computed.__detected) ) d.push(obs); emit('get'); return arr; }
        function set( v )      { if ( !v.push ) throw new Error( "Cannot replace array with some other variable type" );
                                 var o = arr; arr = v; emit('change',{oldValue:o,newValue:v,added:v,deleted:o}); return obs;
                               }
        function emit( e, d )  { listeners.filter(function(l){ return l.__event===e;}).forEach(function(l){ l.call( null, d );}); return obs; }
        function on( e, l )    { l.__event = e; listeners.push( l ); emit('addListener', l ); return obs; }
        function off( e )      { listeners = listeners.filter(e.match ? filEvent(e) : filFunct(e)); emit('removeListener', e ); return obs; }

        function pop()         { var o = [].slice.call(arr), a = arr.pop(); emit('change',{oldValue:o,newValue:arr,deleted:a}); return a; }
        function shift()       { var o = [].slice.call(arr), a = arr.shift(); emit('change', {oldValue:o,newValue:arr,deleted:a}); return a; }

        function push()        { var o = [].slice.call(arr), a = [].slice.call(arguments); [].push.apply(arr,a); emit('change',{oldValue:o,newValue:arr,added:a});return obs; }
        function unshift()     { var o = [].slice.call(arr), a = [].slice.call(arguments); [].unshift.apply(arr,a); emit('change',{oldValue:o,newValue:arr,added:a}); return obs; }
        function splice()      { var o = [].slice.call(arr), a = [].slice.call(arguments); [].splice.apply(arr,a);
                                 emit('change',{oldValue:o,newValue:arr,added:diff(arr,o),deleted:diff(o,arr)}); return obs; }
        function sort()        { var o = [].slice.call(arr), a = [].slice.call(arguments); arr = [].sort.apply(arr,a); emit('change', {oldValue:o, newValue:arr}); return obs; }
        function reverse()     { var o = [].slice.call(arr), a = [].slice.call(arguments); arr = [].reverse.apply(arr,a); emit('change', {oldValue:o, newValue:arr}); return obs; }
        function filter()      { var o = [].slice.call(arr), a = [].slice.call(arguments); arr = [].filter.apply(arr,a);
                                 emit('change', {oldValue:o, newValue:arr,deleted:diff(o,arr)}); return obs; }


        obs.get     = get;
        obs.set     = set;
        obs.emit    = obs.trigger = emit;
        obs.on      = obs.addEventListener = on;
        obs.off     = obs.removeEventListener = off;
        obs.pop     = pop;
        obs.shift   = shift;
        obs.push    = push;
        obs.unshift = unshift;
        obs.filter  = filter;

        obs.listeners = function(){ return listeners; }

        return obs;

    }


    function Computed( fn, o ){
        if (!fn || !fn.call) throw new Error( "Computed needs a computing function!" );
        o = o || {};

        var deps = [], listeners = [], val;

        function obs()        { return get(); }

        function update()     { var o = val; val = fn(); emit('change', {oldValue: o, newValue: val}); return obs; }
        function get()        { var d; if (Computed && (d = Computed.__detected) ) d.push(obs); emit('get'); return val; }
        function emit( e, d ) { listeners.filter(function(l){ return l.__event===e;}).forEach(function(l){ l.call( null, d );}); return obs; }
        function on( e, l )   { l.__event = e; listeners.push( l ); emit('addListener', l ); return obs; }
        function off( e )     { listeners = listeners.filter(e.match ? filEvent(e) : filFunct(e)); emit('removeListener', e ); return obs; }
        function attach()     { deps.forEach(function(obs){ obs.on('change', o.debounce ? debounce(o.debounce,update) : update); }); }
        function detach()     { deps.forEach(function(obs){ obs.off(update); }); }

        obs.get     = get;                                         // add functions
        obs.emit    = obs.trigger = emit;
        obs.on      = obs.addEventListener = on;
        obs.off     = obs.removeEventListener = off;
        obs.update  = update;
        obs.destroy = detach;

        obs.listeners = function(){ return listeners; }

        Computed.__detected = [];                                 // prepare dependency detection
        update();                                                 // start dependency detection
        deps = val.__dependencies = Computed.__detected;          // evaluate dependency detection
        delete Computed.__detected;                               // clean up dependency detection

        attach(); // set up listeners

        return obs;
    }

    Observable.Computed = Computed;
    Observable.ObservableArray = ObservableArray;
    
    return Observable;
});
